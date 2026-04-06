export interface VideoItem {
  videoId: string;
  title: string;
  channelName: string;
  publishedAt: string;
  thumbnail: string;
}

const YT_BASE = "https://www.googleapis.com/youtube/v3";

async function ytFetch(
  endpoint: string,
  params: Record<string, string>,
  accessToken: string
): Promise<Response> {
  const url = new URL(`${YT_BASE}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  });
  return res;
}

async function getSubscribedChannelIds(accessToken: string): Promise<string[]> {
  const channelIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const params: Record<string, string> = {
      part: "snippet",
      mine: "true",
      maxResults: "50",
    };
    if (pageToken) params.pageToken = pageToken;

    const res = await ytFetch("subscriptions", params, accessToken);
    if (!res.ok) throw new Error(`subscriptions.list failed: ${res.status}`);

    const data = await res.json();
    for (const item of data.items ?? []) {
      const id: string = item.snippet?.resourceId?.channelId;
      if (id) channelIds.push(id);
    }
    pageToken = data.nextPageToken;
    // Cap at 200 subscriptions to stay within quota
  } while (pageToken && channelIds.length < 200);

  return channelIds;
}

async function getUploadsPlaylistIds(
  channelIds: string[],
  accessToken: string
): Promise<string[]> {
  const playlistIds: string[] = [];

  // Batch in groups of 50
  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50);
    const res = await ytFetch(
      "channels",
      { part: "contentDetails", id: batch.join(","), maxResults: "50" },
      accessToken
    );
    if (!res.ok) throw new Error(`channels.list failed: ${res.status}`);

    const data = await res.json();
    for (const item of data.items ?? []) {
      const pid: string =
        item.contentDetails?.relatedPlaylists?.uploads;
      if (pid) playlistIds.push(pid);
    }
  }

  return playlistIds;
}

async function getLatestVideoFromPlaylist(
  playlistId: string,
  accessToken: string
): Promise<VideoItem | null> {
  const res = await ytFetch(
    "playlistItems",
    { part: "snippet", playlistId, maxResults: "1" },
    accessToken
  );
  if (!res.ok) return null;

  const data = await res.json();
  const item = data.items?.[0];
  if (!item) return null;

  const snippet = item.snippet;
  const videoId: string = snippet?.resourceId?.videoId;
  if (!videoId) return null;

  return {
    videoId,
    title: snippet.title ?? "Untitled",
    channelName: snippet.channelTitle ?? "",
    publishedAt: snippet.publishedAt ?? "",
    thumbnail:
      snippet.thumbnails?.high?.url ??
      snippet.thumbnails?.medium?.url ??
      snippet.thumbnails?.default?.url ??
      "",
  };
}

export async function getFeed(accessToken: string): Promise<VideoItem[]> {
  const channelIds = await getSubscribedChannelIds(accessToken);
  if (channelIds.length === 0) return [];

  const playlistIds = await getUploadsPlaylistIds(channelIds, accessToken);
  if (playlistIds.length === 0) return [];

  // Fetch latest video from each playlist concurrently (in batches to be safe)
  const CONCURRENCY = 20;
  const results: VideoItem[] = [];

  for (let i = 0; i < playlistIds.length; i += CONCURRENCY) {
    const batch = playlistIds.slice(i, i + CONCURRENCY);
    const videos = await Promise.all(
      batch.map((pid) => getLatestVideoFromPlaylist(pid, accessToken))
    );
    for (const v of videos) {
      if (v) results.push(v);
    }
  }

  // Sort newest first, return top 50
  results.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return results.slice(0, 50);
}

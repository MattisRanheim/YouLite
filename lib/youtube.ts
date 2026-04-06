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

async function getVideosFromPlaylist(
  playlistId: string,
  count: number,
  accessToken: string
): Promise<VideoItem[]> {
  const res = await ytFetch(
    "playlistItems",
    { part: "snippet", playlistId, maxResults: String(count) },
    accessToken
  );
  if (!res.ok) return [];

  const data = await res.json();
  const items: VideoItem[] = [];

  for (const item of data.items ?? []) {
    const snippet = item.snippet;
    const videoId: string = snippet?.resourceId?.videoId;
    if (!videoId) continue;
    items.push({
      videoId,
      title: snippet.title ?? "Untitled",
      channelName: snippet.channelTitle ?? "",
      publishedAt: snippet.publishedAt ?? "",
      thumbnail:
        snippet.thumbnails?.high?.url ??
        snippet.thumbnails?.medium?.url ??
        snippet.thumbnails?.default?.url ??
        "",
    });
  }

  return items;
}

/** Parse ISO 8601 duration (e.g. "PT1M30S") into total seconds. */
function parseDurationSeconds(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = parseInt(m[1] ?? "0", 10);
  const min = parseInt(m[2] ?? "0", 10);
  const sec = parseInt(m[3] ?? "0", 10);
  return h * 3600 + min * 60 + sec;
}

/** Filter out Shorts by fetching durations and removing videos ≤ 60 seconds. */
async function filterOutShorts(
  videos: VideoItem[],
  accessToken: string
): Promise<VideoItem[]> {
  if (videos.length === 0) return [];

  const shortIds = new Set<string>();

  for (let i = 0; i < videos.length; i += 50) {
    const batch = videos.slice(i, i + 50);
    const ids = batch.map((v) => v.videoId).join(",");
    const res = await ytFetch(
      "videos",
      { part: "contentDetails", id: ids, maxResults: "50" },
      accessToken
    );
    if (!res.ok) continue;

    const data = await res.json();
    for (const item of data.items ?? []) {
      const duration: string = item.contentDetails?.duration ?? "";
      if (parseDurationSeconds(duration) <= 120) {
        shortIds.add(item.id as string);
      }
    }
  }

  return videos.filter((v) => !shortIds.has(v.videoId));
}

const PAGE_SIZE = 50;

export async function getFeed(
  accessToken: string,
  page = 1
): Promise<VideoItem[]> {
  const channelIds = await getSubscribedChannelIds(accessToken);
  if (channelIds.length === 0) return [];

  const playlistIds = await getUploadsPlaylistIds(channelIds, accessToken);
  if (playlistIds.length === 0) return [];

  // Fetch `page` videos per playlist so we have enough to fill page N after
  // sorting and filtering. Capped at 10 to keep quota reasonable.
  const videosPerPlaylist = Math.min(page, 10);

  const CONCURRENCY = 20;
  const results: VideoItem[] = [];

  for (let i = 0; i < playlistIds.length; i += CONCURRENCY) {
    const batch = playlistIds.slice(i, i + CONCURRENCY);
    const batched = await Promise.all(
      batch.map((pid) => getVideosFromPlaylist(pid, videosPerPlaylist, accessToken))
    );
    for (const videos of batched) results.push(...videos);
  }

  // Sort newest first, strip Shorts, then return the slice for this page
  results.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const withoutShorts = await filterOutShorts(results, accessToken);
  const start = (page - 1) * PAGE_SIZE;

  return withoutShorts.slice(start, start + PAGE_SIZE);
}

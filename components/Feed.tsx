"use client";

import { useState, useEffect, useCallback } from "react";
import VideoCard from "./VideoCard";
import VideoModal from "./VideoModal";
import type { VideoItem } from "@/lib/youtube";

function SkeletonCard() {
  return (
    <div className="flex flex-col w-full bg-surface rounded-lg overflow-hidden animate-pulse">
      <div className="w-full aspect-video bg-surface-elevated" />
      <div className="p-2.5 flex flex-col gap-2">
        <div className="h-3.5 bg-surface-elevated rounded w-full" />
        <div className="h-3.5 bg-surface-elevated rounded w-3/4" />
        <div className="h-3 bg-surface-elevated rounded w-1/3 mt-1" />
      </div>
    </div>
  );
}

export default function Feed() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feed?page=1");
      if (res.status === 401) {
        setError("session_expired");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: VideoItem[] = await res.json();
      setVideos(data);
      setPage(1);
      setHasMore(data.length === 50);
    } catch (err) {
      console.error(err);
      setError("Failed to load feed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/feed?page=${nextPage}`);
      if (res.status === 401) {
        setError("session_expired");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: VideoItem[] = await res.json();
      setVideos((prev) => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === 50);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }, [page]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  return (
    <>
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && error === "session_expired" && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
          <p className="text-text-muted text-sm">Your session expired.</p>
          <a
            href="/login"
            className="px-4 py-2 bg-surface-elevated hover:bg-border text-text-primary text-sm rounded-lg transition-colors"
          >
            Sign in again
          </a>
        </div>
      )}

      {!loading && error && error !== "session_expired" && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
          <p className="text-text-muted text-sm">Failed to load feed. Please try again.</p>
          <button
            onClick={loadFeed}
            className="px-4 py-2 bg-surface-elevated hover:bg-border text-text-primary text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && videos.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <p className="text-text-muted text-sm">No videos found.</p>
        </div>
      )}

      {!loading && !error && videos.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
            {videos.map((video) => (
              <VideoCard
                key={video.videoId}
                video={video}
                onClick={setActiveVideo}
              />
            ))}
          </div>

          {/* Load more */}
          <div className="px-4 pb-8">
            {hasMore ? (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-4 bg-surface hover:bg-surface-elevated border border-border rounded-xl text-text-muted hover:text-text-primary text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            ) : (
              <p className="text-center text-text-muted text-xs py-4">
                You&apos;ve reached the end
              </p>
            )}
          </div>
        </>
      )}

      {activeVideo && (
        <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </>
  );
}

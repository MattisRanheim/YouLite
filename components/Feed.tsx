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
  const [error, setError] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feed");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVideos(data);
    } catch (err) {
      console.error(err);
      setError("Failed to load feed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

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

      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-4">
          <p className="text-text-muted">{error}</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
          {videos.map((video) => (
            <VideoCard
              key={video.videoId}
              video={video}
              onClick={setActiveVideo}
            />
          ))}
        </div>
      )}

      {activeVideo && (
        <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </>
  );
}

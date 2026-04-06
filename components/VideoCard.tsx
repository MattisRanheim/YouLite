"use client";

import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import type { VideoItem } from "@/lib/youtube";

interface VideoCardProps {
  video: VideoItem;
  onClick: (video: VideoItem) => void;
}

export default function VideoCard({ video, onClick }: VideoCardProps) {
  const timeAgo = video.publishedAt
    ? formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true })
    : "";

  return (
    <button
      onClick={() => onClick(video)}
      className="group flex flex-col w-full text-left bg-surface rounded-lg overflow-hidden hover:bg-surface-elevated transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-surface-elevated overflow-hidden">
        {video.thumbnail ? (
          <Image
            src={video.thumbnail}
            alt={video.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-[1.02] transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-text-muted"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="p-2.5 flex flex-col gap-1">
        <p className="text-text-primary text-sm font-medium leading-snug line-clamp-2">
          {video.title}
        </p>
        <p className="text-text-muted text-xs truncate">{video.channelName}</p>
        <p className="text-text-muted text-xs">{timeAgo}</p>
      </div>
    </button>
  );
}

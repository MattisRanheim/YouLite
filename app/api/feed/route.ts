import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFeed } from "@/lib/youtube";

// Simple in-memory cache keyed by "token:page"
const cache = new Map<string, { data: unknown; expires: number }>();
const TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
  const cacheKey = `${session.access_token}:${page}`;

  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const feed = await getFeed(session.access_token, page);
    cache.set(cacheKey, { data: feed, expires: Date.now() + TTL_MS });

    // Prune stale entries
    cache.forEach((value, key) => {
      if (value.expires < Date.now()) cache.delete(key);
    });

    return NextResponse.json(feed);
  } catch (err) {
    console.error("Feed fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch feed" },
      { status: 500 }
    );
  }
}

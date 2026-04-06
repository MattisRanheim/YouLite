import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFeed } from "@/lib/youtube";

// Simple in-memory cache per access token
const cache = new Map<string, { data: unknown; expires: number }>();
const TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function GET() {
  const session = await auth();

  if (!session?.access_token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = session.access_token;
  const cached = cache.get(token);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const feed = await getFeed(token);
    cache.set(token, { data: feed, expires: Date.now() + TTL_MS });

    // Prune stale entries to avoid unbounded memory growth
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

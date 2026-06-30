/**
 * Memoria AI — YouTube Transcript API Route
 *
 * Fetches YouTube video transcripts server-side from Vercel's infrastructure.
 * This bypasses YouTube's IP blocking of cloud providers like Render,
 * since Vercel serverless functions use different IP ranges.
 */

import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    // Extract video ID from URL
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    const videoId = match[1];

    const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    const transcript = transcriptItems.map((item) => item.text).join(" ");

    return NextResponse.json({ transcript, video_id: videoId });
  } catch (error: any) {
    const errMsg = error?.message || "Failed to fetch transcript";

    // Clean error message for IP blocks (unlikely from Vercel but just in case)
    if (
      errMsg.toLowerCase().includes("blocking") ||
      errMsg.toLowerCase().includes("ip")
    ) {
      return NextResponse.json(
        {
          error:
            "YouTube is temporarily blocking transcript requests. Please try again in a few minutes.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

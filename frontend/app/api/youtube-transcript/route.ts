/**
 * Memoria AI — YouTube Transcript API Route (Robust Multi-Strategy)
 *
 * Fetches YouTube video transcripts server-side using multiple fallback
 * strategies to handle YouTube's IP blocking of cloud providers.
 *
 * Strategies (tried in order):
 * 1. youtube-transcript.ai public API — works from any IP, no auth needed
 * 2. youtube-transcript npm package — works locally / non-blocked IPs
 * 3. Direct InnerTube API with WEB client context
 */

import { NextRequest, NextResponse } from "next/server";

// ── Strategy 1: youtube-transcript.ai public API ──────────────────────
// This service handles YouTube's anti-bot measures on their side.
// The .txt endpoint returns a formatted transcript that we parse.

async function fetchViaTranscriptAI(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://youtube-transcript.ai/transcript/${videoId}.txt`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept: "text/plain",
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) return null;
    const text = await res.text();

    // The .txt response starts with markdown headers, then has timestamped lines.
    // Format: "# Transcript: ...\n\nSource video: ...\n\n## Transcript\n[0:01] text\n[0:32] text\n..."
    // We strip the header section and timestamps, keeping only the transcript text.
    const transcriptSection = text.split("## Transcript\n")[1];
    if (!transcriptSection) {
      // Might be plain text without headers — use the whole thing
      return text.length > 50 ? text : null;
    }

    // Remove timestamp markers like [0:01], [12:34], [1:23:45]
    const cleaned = transcriptSection
      .replace(/\[[\d:]+\]\s*/g, "")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned.length > 50 ? cleaned : null;
  } catch {
    return null;
  }
}

// ── Strategy 2: youtube-transcript npm package ────────────────────────
// Works from non-blocked IPs (local dev, some cloud regions)

async function fetchViaNpmPackage(videoId: string): Promise<string | null> {
  try {
    const { YoutubeTranscript } = await import("youtube-transcript");
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    if (!items || items.length === 0) return null;
    const text = items.map((item: any) => item.text).join(" ");
    return text.length > 50 ? text : null;
  } catch {
    return null;
  }
}

// ── Strategy 3: Direct InnerTube API with page scrape ─────────────────
// Fetches the YouTube watch page and extracts caption data from the
// embedded ytInitialPlayerResponse JSON, then fetches the caption XML.

async function fetchViaPageScrape(videoId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          Cookie:
            "CONSENT=PENDING+987; SOCS=CAESEwgDEgk2NDcwMTEwNTQaAmVuIAEaBgiA_LyaBg",
        },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!res.ok) return null;
    const html = await res.text();

    if (html.includes('class="g-recaptcha"')) return null;

    // Use brace-depth parsing like the npm package (regex is unreliable for huge JSON)
    const startToken = "var ytInitialPlayerResponse = ";
    const startIndex = html.indexOf(startToken);
    if (startIndex === -1) return null;
    const jsonStart = startIndex + startToken.length;

    let depth = 0;
    let jsonEnd = -1;
    for (let i = jsonStart; i < html.length; i++) {
      if (html[i] === "{") depth++;
      else if (html[i] === "}") {
        depth--;
        if (depth === 0) {
          jsonEnd = i + 1;
          break;
        }
      }
    }
    if (jsonEnd === -1) return null;

    const playerData = JSON.parse(html.slice(jsonStart, jsonEnd));
    const tracks =
      playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) return null;

    // Prefer English track
    const track =
      tracks.find((t: any) => t.languageCode === "en") || tracks[0];
    const baseUrl = track?.baseUrl;
    if (!baseUrl) return null;

    // Fetch the actual caption XML
    const captionRes = await fetch(baseUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!captionRes.ok) return null;
    const xml = await captionRes.text();

    // Parse transcript XML
    const matches = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
    if (matches.length === 0) return null;
    const text = matches
      .map((m) =>
        m[1]
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, " ")
          .replace(/<[^>]+>/g, "")
      )
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return text.length > 50 ? text : null;
  } catch {
    return null;
  }
}

// ── Main Route Handler ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "YouTube URL is required" },
        { status: 400 }
      );
    }

    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid YouTube URL" },
        { status: 400 }
      );
    }

    const videoId = match[1];

    // Try multiple strategies — prioritize services that work from cloud IPs
    const strategies: { name: string; fn: () => Promise<string | null> }[] = [
      {
        name: "youtube-transcript.ai",
        fn: () => fetchViaTranscriptAI(videoId),
      },
      { name: "youtube-transcript npm", fn: () => fetchViaNpmPackage(videoId) },
      { name: "Page scrape", fn: () => fetchViaPageScrape(videoId) },
    ];

    for (const strategy of strategies) {
      console.log(`[youtube-transcript] Trying: ${strategy.name}`);
      try {
        const transcript = await strategy.fn();
        if (transcript) {
          console.log(
            `[youtube-transcript] ✓ Success via ${strategy.name} (${transcript.length} chars)`
          );
          return NextResponse.json({ transcript, video_id: videoId });
        }
        console.log(`[youtube-transcript] ✗ ${strategy.name}: no result`);
      } catch (err) {
        console.log(`[youtube-transcript] ✗ ${strategy.name} threw: ${err}`);
      }
    }

    return NextResponse.json(
      {
        error:
          "Could not fetch transcript. The video may not have captions, or all transcript sources are temporarily unavailable.",
      },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch transcript" },
      { status: 500 }
    );
  }
}

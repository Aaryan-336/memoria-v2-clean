/**
 * Memoria AI — YouTube Transcript API Route (Robust Multi-Strategy)
 *
 * Fetches YouTube video transcripts server-side using multiple fallback
 * strategies to handle YouTube's IP blocking of cloud providers.
 *
 * Strategies (tried in order):
 * 1. InnerTube Player API (WEB client) — direct YouTube API with browser headers
 * 2. InnerTube Player API (ANDROID client) — mobile YouTube API
 * 3. YouTube page scraping with consent cookies — bypasses EU consent redirects
 * 4. Invidious public API — community-run YouTube proxies
 */

import { NextRequest, NextResponse } from "next/server";

// ── Shared Helpers ────────────────────────────────────────────────────

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "");
}

function parseTranscriptXml(xml: string): string | null {
  const matches = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
  if (matches.length === 0) return null;
  const text = matches
    .map((m) => decodeHtmlEntities(m[1]))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return text || null;
}

async function extractTranscriptFromCaptionTracks(
  captionTracks: any[]
): Promise<string | null> {
  // Prefer English track, fall back to first available
  const track =
    captionTracks.find((t: any) => t.languageCode === "en") ||
    captionTracks[0];
  const baseUrl = track?.baseUrl;
  if (!baseUrl) return null;

  // Try JSON3 format first (more structured, easier to parse)
  try {
    const jsonRes = await fetch(`${baseUrl}&fmt=json3`);
    if (jsonRes.ok) {
      const data = await jsonRes.json();
      const events = data?.events;
      if (Array.isArray(events)) {
        const text = events
          .filter((e: any) => e.segs)
          .map((e: any) => e.segs.map((s: any) => s.utf8 || "").join(""))
          .join(" ")
          .replace(/\n/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (text) return text;
      }
    }
  } catch {
    /* fall through to XML */
  }

  // Fallback to XML format
  try {
    const xmlRes = await fetch(baseUrl);
    if (xmlRes.ok) {
      return parseTranscriptXml(await xmlRes.text());
    }
  } catch {
    /* exhausted */
  }

  return null;
}

// ── Strategy 1: InnerTube Player API (WEB client) ─────────────────────

async function fetchViaInnerTubeWeb(
  videoId: string
): Promise<string | null> {
  try {
    const res = await fetch(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Origin: "https://www.youtube.com",
          Referer: "https://www.youtube.com/",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "WEB",
              clientVersion: "2.20241202.07.00",
              hl: "en",
              gl: "US",
            },
          },
          videoId,
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const tracks =
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) return null;
    return await extractTranscriptFromCaptionTracks(tracks);
  } catch {
    return null;
  }
}

// ── Strategy 2: InnerTube Player API (ANDROID client) ─────────────────

async function fetchViaInnerTubeAndroid(
  videoId: string
): Promise<string | null> {
  try {
    const res = await fetch(
      "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "com.google.android.youtube/19.29.37 (Linux; U; Android 14)",
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: "ANDROID",
              clientVersion: "19.29.37",
              hl: "en",
              gl: "US",
              androidSdkVersion: 34,
            },
          },
          videoId,
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const tracks =
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) return null;
    return await extractTranscriptFromCaptionTracks(tracks);
  } catch {
    return null;
  }
}

// ── Strategy 3: YouTube page scraping with consent cookies ────────────

async function fetchViaPageScrape(
  videoId: string
): Promise<string | null> {
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
      }
    );
    if (!res.ok) return null;
    const html = await res.text();

    // Extract ytInitialPlayerResponse from the page
    const match = html.match(
      /var\s+ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\})\s*;\s*(?:var|<\/script>)/
    );
    if (!match) return null;

    const playerData = JSON.parse(match[1]);
    const tracks =
      playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!Array.isArray(tracks) || tracks.length === 0) return null;
    return await extractTranscriptFromCaptionTracks(tracks);
  } catch {
    return null;
  }
}

// ── Strategy 4: Invidious public API ──────────────────────────────────

async function fetchViaInvidious(
  videoId: string
): Promise<string | null> {
  const instances = [
    "https://inv.nadeko.net",
    "https://invidious.fdn.fr",
    "https://vid.puffyan.us",
    "https://invidious.nerdvpn.de",
    "https://yewtu.be",
  ];

  for (const instance of instances) {
    try {
      // Get available caption tracks
      const listRes = await fetch(
        `${instance}/api/v1/captions/${videoId}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!listRes.ok) continue;
      const listData = await listRes.json();
      const captions = listData?.captions;
      if (!Array.isArray(captions) || captions.length === 0) continue;

      // Prefer English caption
      const caption =
        captions.find(
          (c: any) =>
            c.language_code === "en" ||
            c.label?.toLowerCase().includes("english")
        ) || captions[0];

      // Download subtitle content
      let subUrl = caption.url;
      if (!subUrl.startsWith("http")) subUrl = `${instance}${subUrl}`;
      const subRes = await fetch(subUrl, {
        signal: AbortSignal.timeout(8000),
      });
      if (!subRes.ok) continue;
      const vttText = await subRes.text();

      // Parse VTT/SRT — keep only actual transcript lines
      const lines = vttText
        .split("\n")
        .filter(
          (line) =>
            line.trim() &&
            !line.includes("-->") &&
            !line.trim().match(/^\d+$/) &&
            !line.startsWith("WEBVTT") &&
            !line.startsWith("Kind:") &&
            !line.startsWith("Language:") &&
            !line.startsWith("NOTE")
        )
        .map((line) => line.trim());

      const text = lines.join(" ").replace(/\s+/g, " ").trim();
      if (text) return text;
    } catch {
      continue;
    }
  }

  return null;
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

    // Try multiple strategies in order of reliability
    const strategies: { name: string; fn: () => Promise<string | null> }[] = [
      { name: "InnerTube WEB", fn: () => fetchViaInnerTubeWeb(videoId) },
      {
        name: "InnerTube ANDROID",
        fn: () => fetchViaInnerTubeAndroid(videoId),
      },
      { name: "Page scrape", fn: () => fetchViaPageScrape(videoId) },
      { name: "Invidious API", fn: () => fetchViaInvidious(videoId) },
    ];

    for (const strategy of strategies) {
      console.log(`[youtube-transcript] Trying: ${strategy.name}`);
      try {
        const transcript = await strategy.fn();
        if (transcript && transcript.length > 50) {
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

import { NextRequest, NextResponse } from 'next/server';

const ARK_IMAGE_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const ARK_IMAGE_MODEL = 'doubao-seedream-5-0-260128';
const REQUEST_TIMEOUT_MS = 60_000;

type ArkImageResponse = {
  data?: Array<{
    url?: string;
  }>;
  error?: {
    message?: string;
  };
};

export async function POST(request: NextRequest) {
  try {
    const { prompt, size = '2K' } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.ARK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ARK_API_KEY is not configured' },
        { status: 500 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const startedAt = Date.now();

    try {
      console.log('[image] request start', {
        model: ARK_IMAGE_MODEL,
        size,
      });

      const response = await fetch(ARK_IMAGE_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ARK_IMAGE_MODEL,
          prompt,
          sequential_image_generation: 'disabled',
          response_format: 'url',
          size,
          stream: false,
          watermark: false,
        }),
        signal: controller.signal,
      });

      const durationMs = Date.now() - startedAt;
      const responseText = await response.text();

      console.log('[image] request end', {
        status: response.status,
        durationMs,
      });

      if (!response.ok) {
        const errorMessage = getArkErrorMessage(response.status, responseText);
        return NextResponse.json({ error: errorMessage }, { status: mapErrorStatus(response.status) });
      }

      const data = parseArkResponse(responseText);
      const imageUrls = (data.data || [])
        .map((item) => item.url)
        .filter((url): url is string => typeof url === 'string' && url.length > 0);

      if (imageUrls.length === 0) {
        return NextResponse.json(
          { error: 'Image service returned no images' },
          { status: 502 },
        );
      }

      return NextResponse.json({ imageUrls });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[image] request end', {
          status: 'timeout',
          durationMs: Date.now() - startedAt,
        });

        return NextResponse.json(
          { error: 'Image generation request timed out' },
          { status: 504 },
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error('[image] generation error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function parseArkResponse(responseText: string): ArkImageResponse {
  try {
    return JSON.parse(responseText) as ArkImageResponse;
  } catch {
    return {};
  }
}

function getArkErrorMessage(status: number, responseText: string): string {
  const parsed = parseArkResponse(responseText);
  const upstreamMessage = parsed.error?.message;

  if (status === 400) {
    return upstreamMessage || 'Image request is invalid';
  }
  if (status === 401) {
    return upstreamMessage || 'ARK_API_KEY is invalid';
  }
  if (status === 403) {
    return upstreamMessage || 'Image generation is not allowed for this account';
  }
  if (status === 429) {
    return upstreamMessage || 'Image generation rate limit exceeded';
  }
  if (status >= 500) {
    return upstreamMessage || 'Image service is temporarily unavailable';
  }

  return upstreamMessage || 'Image generation failed';
}

function mapErrorStatus(status: number): number {
  if (status === 400 || status === 401 || status === 403 || status === 429) {
    return status;
  }

  if (status >= 500) {
    return 502;
  }

  return 500;
}

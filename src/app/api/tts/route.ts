import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_SPEECH_URL = 'https://openrouter.ai/api/v1/audio/speech';
const OPENROUTER_TTS_MODEL = 'openai/gpt-4o-mini-tts-2025-12-15';
const REQUEST_TIMEOUT_MS = 60_000;

type SpeechFormat = 'mp3';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY is not configured' },
        { status: 500 },
      );
    }

    const audio = await synthesizeSpeech(text.trim(), apiKey);

    return NextResponse.json({
      audioUrl: `data:${audio.mimeType};base64,${audio.bytes.toString('base64')}`,
      audioSize: audio.bytes.byteLength,
    });
  } catch (error) {
    if (error instanceof EmptyAudioError) {
      return NextResponse.json(
        {
          error: 'OpenRouter speech returned empty audio',
          detail: 'Upstream returned 200 with empty body',
        },
        { status: 502 },
      );
    }

    const detail = error instanceof Error ? error.message : String(error);
    console.error('[tts] synthesis failed', detail);

    return NextResponse.json(
      { error: 'TTS synthesis failed', detail },
      { status: 502 },
    );
  }
}

async function synthesizeSpeech(text: string, apiKey: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const responseFormat: SpeechFormat = 'mp3';

  try {
    const response = await fetch(OPENROUTER_SPEECH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENROUTER_TTS_MODEL,
        input: text,
        voice: 'nova',
        response_format: responseFormat,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `OpenRouter speech failed: ${response.status} ${detail.slice(0, 300)}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);

    if (bytes.byteLength === 0) {
      throw new EmptyAudioError();
    }

    return {
      bytes,
      mimeType: 'audio/mpeg',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenRouter speech request timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

class EmptyAudioError extends Error {
  constructor() {
    super('OpenRouter speech returned empty audio');
    this.name = 'EmptyAudioError';
  }
}

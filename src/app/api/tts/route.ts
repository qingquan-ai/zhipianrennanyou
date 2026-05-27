import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_MINIMAX_API_BASE_URL = 'https://api.minimax.io';
const MINIMAX_TTS_PATH = '/v1/t2a_v2';
const MINIMAX_TTS_MODEL = 'speech-2.8-turbo';
const REQUEST_TIMEOUT_MS = 60_000;

const DEFAULT_MINIMAX_TTS_CONFIG = {
  voiceId: 'Chinese (Mandarin)_Gentleman',
  speed: 1,
  pitch: 0,
} as const;

const MINIMAX_TTS_CONFIG_BY_CHARACTER_ID = {
  'gu-lie': {
    label: '顾烈',
    roleTone: '成熟总裁，低沉、稳、强安全感',
    voiceId: 'Chinese (Mandarin)_Gentleman',
    speed: 0.9,
    pitch: -1,
  },
  'lin-yu': {
    label: '林屿',
    roleTone: '温柔医生，干净、克制、共情',
    voiceId: 'Chinese (Mandarin)_Gentle_Youth',
    speed: 0.94,
    pitch: 0,
  },
  'shen-mo': {
    label: '沈默',
    roleTone: '成熟律师，冷静、理性、边界感',
    voiceId: 'Chinese (Mandarin)_Sincere_Adult',
    speed: 0.9,
    pitch: -1,
  },
  'su-chen': {
    label: '苏晨',
    roleTone: '大学生，阳光、自然、少年感',
    voiceId: 'Chinese (Mandarin)_Straightforward_Boy',
    speed: 1.05,
    pitch: 1,
  },
} as const;

type MinimaxTtsConfig =
  | typeof DEFAULT_MINIMAX_TTS_CONFIG
  | (typeof MINIMAX_TTS_CONFIG_BY_CHARACTER_ID)[keyof typeof MINIMAX_TTS_CONFIG_BY_CHARACTER_ID];

type MinimaxTtsResponse = {
  data?: {
    audio?: string;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
};

export async function POST(request: NextRequest) {
  try {
    const { text, characterId } = await request.json();

    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'MINIMAX_API_KEY is not configured' },
        { status: 500 },
      );
    }

    const selectedConfig = getTtsConfig(characterId);
    const audio = await synthesizeSpeech(text.trim(), apiKey, selectedConfig);

    return NextResponse.json({
      audioUrl: `data:${audio.mimeType};base64,${audio.bytes.toString('base64')}`,
      audioSize: audio.bytes.byteLength,
    });
  } catch (error) {
    if (error instanceof EmptyAudioError) {
      return NextResponse.json(
        {
          error: 'MiniMax speech returned empty audio',
          detail: error.message,
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

function getTtsConfig(characterId: unknown): MinimaxTtsConfig {
  if (
    typeof characterId === 'string' &&
    characterId in MINIMAX_TTS_CONFIG_BY_CHARACTER_ID
  ) {
    return MINIMAX_TTS_CONFIG_BY_CHARACTER_ID[
      characterId as keyof typeof MINIMAX_TTS_CONFIG_BY_CHARACTER_ID
    ];
  }

  return DEFAULT_MINIMAX_TTS_CONFIG;
}

function getMinimaxTtsUrl() {
  const baseUrl =
    process.env.MINIMAX_API_BASE_URL?.trim() || DEFAULT_MINIMAX_API_BASE_URL;

  return `${baseUrl.replace(/\/+$/, '')}${MINIMAX_TTS_PATH}`;
}

async function synthesizeSpeech(
  text: string,
  apiKey: string,
  config: MinimaxTtsConfig,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(getMinimaxTtsUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MINIMAX_TTS_MODEL,
        text,
        stream: false,
        language_boost: 'Chinese',
        output_format: 'url',
        voice_setting: {
          voice_id: config.voiceId,
          speed: config.speed,
          vol: 1,
          pitch: config.pitch,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
          channel: 1,
        },
      }),
      signal: controller.signal,
    });
    const responseText = await response.text();

    if (!response.ok) {
      console.error('[tts] MiniMax speech error response', {
        status: response.status,
        body: responseText.slice(0, 300),
      });
      throw new Error(
        `MiniMax speech failed: ${response.status} ${responseText.slice(0, 300)}`,
      );
    }

    let payload: MinimaxTtsResponse;
    try {
      payload = JSON.parse(responseText) as MinimaxTtsResponse;
    } catch {
      throw new Error(
        `MiniMax speech returned invalid JSON: ${responseText.slice(0, 300)}`,
      );
    }

    if (payload.base_resp?.status_code !== 0) {
      const statusCode = payload.base_resp?.status_code ?? 'unknown';
      const statusMsg = payload.base_resp?.status_msg ?? 'Unknown MiniMax error';
      console.error('[tts] MiniMax speech error response', {
        status: response.status,
        body: responseText.slice(0, 300),
      });
      throw new Error(`MiniMax speech failed: ${statusCode} ${statusMsg}`);
    }

    const audioUrl = payload.data?.audio;
    if (typeof audioUrl !== 'string' || !audioUrl.startsWith('http')) {
      console.error('[tts] MiniMax speech returned invalid audio URL', {
        hasAudioUrl: Boolean(audioUrl),
        audioUrlLength: typeof audioUrl === 'string' ? audioUrl.length : 0,
      });
      throw new EmptyAudioError('MiniMax response data.audio is not a valid URL');
    }

    const bytes = await downloadAudio(audioUrl, controller.signal);

    return {
      bytes,
      mimeType: 'audio/mpeg',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('MiniMax speech request timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadAudio(audioUrl: string, signal: AbortSignal) {
  const response = await fetch(audioUrl, { signal });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('[tts] MiniMax audio download failed', {
      status: response.status,
      body: detail.slice(0, 300),
      hasAudioUrl: Boolean(audioUrl),
      audioUrlLength: audioUrl.length,
    });
    throw new Error(
      `MiniMax audio download failed: ${response.status} ${detail.slice(0, 300)}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);

  if (bytes.byteLength === 0) {
    throw new EmptyAudioError('MiniMax audio download returned empty body');
  }

  return bytes;
}

class EmptyAudioError extends Error {
  constructor(message = 'MiniMax speech returned empty audio') {
    super(message);
    this.name = 'EmptyAudioError';
  }
}

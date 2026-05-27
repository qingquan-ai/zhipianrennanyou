import { NextRequest, NextResponse } from 'next/server';

const GROQ_TRANSCRIPTIONS_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';
const GROQ_ASR_MODEL = 'whisper-large-v3-turbo';
const ASR_RECOGNITION_TIMEOUT_MS = 60_000;

type GroqTranscriptionResponse = {
  text?: string;
};

export async function POST(request: NextRequest) {
  try {
    console.info('[asr] request received');
    console.info('[asr] request.formData start');
    const formData = await request.formData();
    console.info('[asr] request.formData complete');

    const audioEntry = formData.get('audio');
    const audioFile = audioEntry instanceof File ? audioEntry : null;

    console.info('[asr] audio file received', {
      exists: Boolean(audioFile),
      name: audioFile?.name,
      type: audioFile?.type,
      size: audioFile?.size,
    });

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'GROQ_API_KEY is not configured',
          message: '语音识别服务未配置',
        },
        { status: 500 },
      );
    }

    console.info('[asr] audioFile.arrayBuffer start');
    const arrayBuffer = await audioFile.arrayBuffer();
    console.info('[asr] audioFile.arrayBuffer complete', {
      byteLength: arrayBuffer.byteLength,
    });

    console.info('[asr] Groq STT start');
    const result = await transcribeWithGroq(
      arrayBuffer,
      audioFile.type,
      apiKey,
    );

    const text = result.text?.trim();
    if (!text) {
      return NextResponse.json(
        {
          error: 'ASR returned empty text',
          message: '未识别到语音，请再说一遍',
        },
        { status: 422 },
      );
    }

    console.info('[asr] Groq STT success', {
      hasText: true,
    });

    return NextResponse.json({ text });
  } catch (error) {
    if (error instanceof AsrTimeoutError) {
      return NextResponse.json(
        {
          error: 'ASR recognition timed out',
          message: '语音识别超时，请重试',
        },
        { status: 504 },
      );
    }

    const detail = getErrorMessage(error);
    console.error('[asr] Groq STT failed', detail);
    return NextResponse.json(
      {
        error: 'ASR recognition failed',
        message: '语音识别失败，请重试',
        detail,
      },
      { status: 502 },
    );
  }
}

async function transcribeWithGroq(
  arrayBuffer: ArrayBuffer,
  mimeType: string,
  apiKey: string,
): Promise<GroqTranscriptionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    ASR_RECOGNITION_TIMEOUT_MS,
  );

  try {
    const upstreamFormData = new FormData();
    const audioBlob = new Blob([arrayBuffer], {
      type: mimeType || 'audio/webm',
    });
    upstreamFormData.append('file', audioBlob, 'recording.webm');
    upstreamFormData.append('model', GROQ_ASR_MODEL);
    upstreamFormData.append('language', 'zh');
    upstreamFormData.append('response_format', 'json');

    const response = await fetch(GROQ_TRANSCRIPTIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: upstreamFormData,
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('[asr] Groq STT error response', {
        status: response.status,
        body: responseText.slice(0, 300),
      });
      throw new Error(
        `Groq STT failed: ${response.status} ${responseText.slice(0, 300)}`,
      );
    }

    try {
      return JSON.parse(responseText) as GroqTranscriptionResponse;
    } catch {
      throw new Error(
        `Groq STT returned invalid JSON: ${responseText.slice(0, 300)}`,
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AsrTimeoutError();
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

class AsrTimeoutError extends Error {
  constructor() {
    super('ASR recognition timed out');
    this.name = 'AsrTimeoutError';
  }
}

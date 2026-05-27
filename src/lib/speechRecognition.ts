/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 语音识别工具函数
 * 使用 MediaRecorder API + 后端 ASR 服务
 */

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onRecording?: (duration: number) => void;
}

interface RecordingState {
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  startTime: number;
  stream: MediaStream | null;
  timeoutId: NodeJS.Timeout | null;
}

let recordingState: RecordingState = {
  mediaRecorder: null,
  audioChunks: [],
  startTime: 0,
  stream: null,
  timeoutId: null,
};

let durationInterval: NodeJS.Timeout | null = null;
const ASR_REQUEST_TIMEOUT_MS = 65_000;

export function isMediaRecorderSupported(): boolean {
  return !!window.MediaRecorder;
}

export async function startSpeechRecognition(
  callbacks: SpeechRecognitionCallbacks,
): Promise<void> {
  recordingState = {
    mediaRecorder: null,
    audioChunks: [],
    startTime: Date.now(),
    stream: null,
    timeoutId: null,
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    recordingState.stream = stream;

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });
    recordingState.mediaRecorder = mediaRecorder;
    recordingState.audioChunks = [];

    mediaRecorder.start(100);
    callbacks.onStart?.();

    recordingState.startTime = Date.now();
    durationInterval = setInterval(() => {
      const duration = (Date.now() - recordingState.startTime) / 1000;
      callbacks.onRecording?.(duration);
    }, 100);

    recordingState.timeoutId = setTimeout(async () => {
      await finishRecording(callbacks, 'timeout');
    }, 50000);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordingState.audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      clearRecordingTimers();
      stopMediaTracks();

      const audioBlob = new Blob(recordingState.audioChunks, {
        type: 'audio/webm',
      });

      if (audioBlob.size < 1000) {
        callbacks.onError?.('未检测到语音，请再说一遍');
        callbacks.onEnd?.();
        return;
      }

      try {
        const text = await transcribeAudioBlob(audioBlob);
        callbacks.onResult?.(text, true);
      } catch (error) {
        console.error('ASR request failed:', error);
        callbacks.onError?.(getAsrErrorMessage(error));
      } finally {
        callbacks.onEnd?.();
      }
    };
  } catch (error: any) {
    console.error('Failed to start recording:', error);

    let errorMessage = '无法访问麦克风，请检查权限设置';
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      errorMessage = '麦克风权限被拒绝，请在设置中允许使用';
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      errorMessage = '未找到麦克风设备';
    }

    callbacks.onError?.(errorMessage);
    callbacks.onEnd?.();
  }
}

export async function stopSpeechRecognition(): Promise<void> {
  await finishRecording(null, 'user_stop');
}

async function finishRecording(
  callbacks: SpeechRecognitionCallbacks | null,
  reason: string,
): Promise<void> {
  clearRecordingTimers();

  const hasAudio = recordingState.audioChunks.length > 0;

  if (recordingState.mediaRecorder && recordingState.mediaRecorder.state !== 'inactive') {
    recordingState.mediaRecorder.stop();
  } else if (!hasAudio && callbacks) {
    if (reason === 'timeout') {
      callbacks.onError?.('未检测到语音，请再说一遍');
    }
    callbacks.onEnd?.();
  }

  stopMediaTracks();
}

async function transcribeAudioBlob(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');

  const recordingDuration = (Date.now() - recordingState.startTime) / 1000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ASR_REQUEST_TIMEOUT_MS);

  console.info('[asr] frontend request start', {
    audioBlobSize: audioBlob.size,
    audioBlobType: audioBlob.type,
    recordingDuration,
    formDataField: 'audio',
  });

  try {
    const response = await fetch('/api/asr', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    console.info('[asr] frontend response received', {
      status: response.status,
      ok: response.ok,
    });

    const result = await response.json().catch(() => ({}));

    if (response.ok && result.text) {
      return result.text;
    }

    throw new Error(result.message || '语音识别失败，请再试一次');
  } finally {
    clearTimeout(timeoutId);
  }
}

function clearRecordingTimers() {
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }
  if (recordingState.timeoutId) {
    clearTimeout(recordingState.timeoutId);
    recordingState.timeoutId = null;
  }
}

function stopMediaTracks() {
  if (recordingState.stream) {
    recordingState.stream.getTracks().forEach((track) => track.stop());
    recordingState.stream = null;
  }
}

function getAsrErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === 'AbortError') {
    return '语音识别超时，请再试一次';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return '语音识别失败，请再试一次';
}

export function isRecording(): boolean {
  return (
    recordingState.mediaRecorder !== null &&
    recordingState.mediaRecorder.state === 'recording'
  );
}

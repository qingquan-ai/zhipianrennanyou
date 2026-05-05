/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 语音识别工具函数
 * 使用 MediaRecorder API + 扣子平台 ASR 服务
 */

// 语音识别回调类型
export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onRecording?: (duration: number) => void;
}

// 语音录制状态
interface RecordingState {
  mediaRecorder: MediaRecorder | null;
  audioChunks: Blob[];
  startTime: number;
  stream: MediaStream | null;
  timeoutId: NodeJS.Timeout | null;
}

// 创建录制实例
let recordingState: RecordingState = {
  mediaRecorder: null,
  audioChunks: [],
  startTime: 0,
  stream: null,
  timeoutId: null
};

// 录音时长更新间隔
let durationInterval: NodeJS.Timeout | null = null;

// 检查浏览器是否支持 MediaRecorder
export function isMediaRecorderSupported(): boolean {
  return !!window.MediaRecorder;
}

// 开始语音录制和识别
export async function startSpeechRecognition(callbacks: SpeechRecognitionCallbacks): Promise<void> {
  // 重置录制状态
  recordingState = {
    mediaRecorder: null,
    audioChunks: [],
    startTime: Date.now(),
    stream: null,
    timeoutId: null
  };

  try {
    // 请求麦克风权限
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true
      }
    });
    recordingState.stream = stream;

    // 创建 MediaRecorder
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    recordingState.mediaRecorder = mediaRecorder;
    recordingState.audioChunks = [];

    // 开始录制
    mediaRecorder.start(100); // 每100ms发送数据块
    callbacks.onStart?.();

    // 开始计时
    recordingState.startTime = Date.now();
    durationInterval = setInterval(() => {
      const duration = (Date.now() - recordingState.startTime) / 1000;
      callbacks.onRecording?.(duration);
    }, 100);

    // 设置 50 秒超时
    recordingState.timeoutId = setTimeout(async () => {
      await finishRecording(callbacks, 'timeout');
    }, 50000);

    // 数据可用时
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordingState.audioChunks.push(event.data);
      }
    };

    // 录制停止时
    mediaRecorder.onstop = async () => {
      // 清理定时器
      if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
      }
      if (recordingState.timeoutId) {
        clearTimeout(recordingState.timeoutId);
        recordingState.timeoutId = null;
      }

      // 停止所有轨道
      if (recordingState.stream) {
        recordingState.stream.getTracks().forEach(track => track.stop());
        recordingState.stream = null;
      }

      // 合并音频块
      const audioBlob = new Blob(recordingState.audioChunks, { type: 'audio/webm' });
      
      // 检查是否有足够的音频数据
      if (audioBlob.size < 1000) {
        callbacks.onError?.('未检测到语音，请再说一遍');
        callbacks.onEnd?.();
        return;
      }
      
      // 发送到后端进行识别
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');

        const response = await fetch('/api/asr', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (response.ok && result.text) {
          callbacks.onResult?.(result.text, true);
        } else {
          // 无识别结果
          callbacks.onError?.('未检测到语音，请再说一遍');
        }
      } catch (error) {
        console.error('ASR request failed:', error);
        callbacks.onError?.('语音识别失败，请重试');
      }

      callbacks.onEnd?.();
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

// 停止录制
export async function stopSpeechRecognition(): Promise<void> {
  await finishRecording(null, 'user_stop');
}

// 内部完成录制方法
async function finishRecording(callbacks: SpeechRecognitionCallbacks | null, reason: string): Promise<void> {
  // 清理定时器
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }
  if (recordingState.timeoutId) {
    clearTimeout(recordingState.timeoutId);
    recordingState.timeoutId = null;
  }

  // 检查是否有录制的音频
  const hasAudio = recordingState.audioChunks.length > 0;

  if (recordingState.mediaRecorder && recordingState.mediaRecorder.state !== 'inactive') {
    recordingState.mediaRecorder.stop();
  } else if (!hasAudio && callbacks) {
    // 没有音频数据且有回调
    if (reason === 'timeout') {
      callbacks.onError?.('未检测到语音，请再说一遍');
    }
    callbacks.onEnd?.();
  }

  // 停止所有轨道
  if (recordingState.stream) {
    recordingState.stream.getTracks().forEach(track => track.stop());
    recordingState.stream = null;
  }
}

// 检查是否正在录制
export function isRecording(): boolean {
  return recordingState.mediaRecorder !== null && recordingState.mediaRecorder.state === 'recording';
}

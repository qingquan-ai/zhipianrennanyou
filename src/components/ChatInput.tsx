'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Send, Mic, MicOff } from 'lucide-react';
import { getCharacterTheme, type CharacterTheme } from '@/lib/characterThemes';
import VoiceWave from './VoiceWave';
import { 
  isMediaRecorderSupported, 
  startSpeechRecognition, 
  stopSpeechRecognition 
} from '@/lib/speechRecognition';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  theme?: CharacterTheme;
}

export interface ChatInputRef {
  focus: () => void;
}

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(({ onSend, disabled, theme = getCharacterTheme() }, ref) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 使用 ref 跟踪是否应该保持焦点
  const shouldMaintainFocus = useRef(false);

  // 暴露 focus 方法给父组件
  useImperativeHandle(ref, () => ({
    focus: () => {
      if (textareaRef.current && !disabled) {
        textareaRef.current.focus();
      }
    }
  }));

  // 清理错误提示
  useEffect(() => {
    if (recordingError) {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        setRecordingError(null);
      }, 3000);
    }
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [recordingError]);

  // 发送消息
  const handleSend = useCallback(() => {
    const trimmedInput = input.trim();
    if (trimmedInput && !disabled && !isRecording) {
      // 清空输入
      setInput('');
      
      // 重置高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      onSend(trimmedInput);
    }
  }, [input, disabled, onSend, isRecording]);

  // 输入变化 - 自动调整高度
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }, []);

  // 回车发送
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // 容器点击 - 点击空白处保持焦点
  const handleContainerClick = useCallback(() => {
    if (!disabled) {
      shouldMaintainFocus.current = true;
      textareaRef.current?.focus();
    }
  }, [disabled]);

  // 语音录制
  const handleVoiceRecord = useCallback(async () => {
    // 检查是否支持语音录制
    if (!isMediaRecorderSupported()) {
      setRecordingError('您的浏览器不支持语音录制');
      return;
    }

    if (isRecording) {
      // 停止录音
      await stopSpeechRecognition();
      setIsRecording(false);
    } else {
      // 开始录音
      setRecordingError(null);
      setInput('');
      setIsRecording(true);
      
      await startSpeechRecognition({
        onStart: () => {
          setIsRecording(true);
        },
        onEnd: () => {
          setIsRecording(false);
        },
        onResult: (text, isFinal) => {
          if (isFinal) {
            // 最终结果，填入输入框
            setInput(text);
          }
        },
        onError: (error) => {
          setIsRecording(false);
          setRecordingError(error);
        },
        onRecording: (duration) => {
          // 录音中
        }
      });
    }
  }, [isRecording]);

  // 聚焦时设置标记
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleFocus = () => {
      shouldMaintainFocus.current = true;
    };

    const handleBlur = () => {
      // 延迟检查，避免点击按钮时误触发
      setTimeout(() => {
        if (!isRecording) {
          shouldMaintainFocus.current = false;
        }
      }, 100);
    };

    textarea.addEventListener('focus', handleFocus);
    textarea.addEventListener('blur', handleBlur);

    return () => {
      textarea.removeEventListener('focus', handleFocus);
      textarea.removeEventListener('blur', handleBlur);
    };
  }, [isRecording]);

  // 错误提示显示
  const showError = recordingError && !isRecording;

  return (
    <div
      ref={containerRef}
      className={`border-t ${theme.inputBorder} ${theme.inputBarBg} px-4 pt-3 pb-4`}
      onClick={handleContainerClick}
    >
      {/* 错误提示 */}
      {showError && (
        <div className="max-w-4xl mx-auto mb-2">
          <div className="px-4 py-2 bg-red-50 text-red-500 text-sm rounded-lg">
            {recordingError}
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        {/* 输入框 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "对方正在输入..." : isRecording ? "正在聆听..." : "输入消息..."}
            disabled={disabled || isRecording}
            rows={1}
            className={`w-full px-4 py-2.5 ${theme.inputFieldBg} rounded-full resize-none focus:outline-none focus:ring-2 ${theme.inputFocusRing} text-sm transition-all ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            } ${isRecording ? 'bg-red-50 cursor-not-allowed' : ''}`}
            style={{ maxHeight: '120px' }}
          />
        </div>

        {/* 声波动画 */}
        <VoiceWave isActive={isRecording} />

        {/* 语音按钮 */}
        <button
          onClick={handleVoiceRecord}
          disabled={disabled}
          className={`p-2.5 rounded-full transition-colors flex-shrink-0 flex items-center ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gray-100 hover:bg-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isRecording ? '点击停止录音' : '点击开始语音输入'}
        >
          {isRecording ? (
            <MicOff className="w-5 h-5 text-white" />
          ) : (
            <Mic className={`w-5 h-5 ${theme.micIcon}`} />
          )}
        </button>

        {/* 发送按钮 */}
        <button
          onClick={handleSend}
          disabled={!input.trim() || disabled || isRecording}
          className={`p-2.5 rounded-full transition-colors flex-shrink-0 ${
            input.trim() && !disabled && !isRecording
              ? theme.sendBtn
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';

export default ChatInput;

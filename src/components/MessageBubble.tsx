'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Character, ChatMessage } from '@/types';
import { Play, Pause, Loader2 } from 'lucide-react';

interface MessageBubbleProps {
  message: ChatMessage;
  character: Character;
  onImageClick: () => void;
}

export default function MessageBubble({ message, character, onImageClick }: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const isUser = message.direction === 'user';
  
  // 处理音频播放
  const togglePlay = async () => {
    if (!audioRef.current || !message.audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Audio play error:', error);
      }
    }
  };
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [message.audioUrl]);
  
  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 图片消息
  if (message.type === 'image' && message.imageUrl) {
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}>
        {/* 角色头像 */}
        {!isUser && (
          <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
            <Image
              src={`/images/characters/${character.id}.jpg`}
              alt={character.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        
        <div className="max-w-xs">
          {/* 图片 */}
          <div
            className="rounded-2xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
            onClick={onImageClick}
          >
            <Image
              src={message.imageUrl}
              alt=""
              width={200}
              height={250}
              className="w-full h-auto object-cover"
              unoptimized
            />
          </div>
        </div>
        
        {isUser && (
          <div className="w-8 h-8 rounded-full bg-pink-500 flex-shrink-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white">我</span>
          </div>
        )}
      </div>
    );
  }
  
  // 流式中状态 - 显示三个点 loading 气泡
  if (message.isStreaming && !message.content) {
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}>
        {/* 角色头像 */}
        {!isUser && (
          <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
            <Image
              src={`/images/characters/${character.id}.jpg`}
              alt={character.name}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        )}
        
        {/* 三个点 loading 气泡 */}
        <div className="bg-white rounded-2xl rounded-bl-md shadow-sm border border-gray-100 px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }
  
  // 正常消息/流式输出中
  if (!message.content?.trim() && !message.imageUrl) {
    return null;
  }

  const isStreaming = message.isStreaming && message.content;
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2 relative`}>
      {/* 角色头像 */}
      {!isUser && (
        <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
          <Image
            src={`/images/characters/${character.id}.jpg`}
            alt={character.name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      
      {/* 消息容器 - 包含语音胶囊和文字气泡 */}
      <div className={`max-w-xs sm:max-w-md ${isUser ? 'order-1' : ''} relative`}>
        
        {/* 语音胶囊 - 文字开始流式输出时就显示 */}
        {!isUser && (message.audioUrl || isStreaming) && (
          <button
            onClick={togglePlay}
            disabled={!message.audioUrl}
            className={`
              absolute -top-2.5 -left-2 z-20 group
              ${!message.audioUrl ? 'cursor-wait' : 'cursor-pointer'}
            `}
            title={!message.audioUrl ? '语音生成中...' : isPlaying ? '暂停播放' : '点击播放语音'}
          >
            <div className={`
              flex items-center gap-1.5 pl-2 pr-3 py-1
              bg-white/80 backdrop-blur-md
              rounded-full
              shadow-sm shadow-gray-200/80
              border border-gray-100
              transition-all duration-200
              ${message.audioUrl ? 'hover:bg-white/95' : 'opacity-70'}
              ${isPlaying ? 'ring-2 ring-pink-200' : ''}
            `}>
              {/* 播放/暂停图标 */}
              <div className="w-5 h-5 flex items-center justify-center">
                {!message.audioUrl ? (
                  <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-3 h-3.5 text-pink-500 fill-pink-500" />
                ) : (
                  <Play className="w-3 h-3.5 text-pink-500 fill-pink-500 ml-0.5" />
                )}
              </div>
              
              {/* 时长 */}
              <span className="text-xs text-gray-500 font-medium tabular-nums">
                {message.audioUrl ? formatTime(duration || 0) : '...'}
              </span>
            </div>
          </button>
        )}
        
        {/* 文字气泡 */}
        <div
          className={`
            px-4 pt-4 pb-3 min-h-[44px]
            ${isUser 
              ? 'bg-pink-500 text-white rounded-2xl rounded-br-md' 
              : 'bg-white text-gray-800 rounded-2xl rounded-bl-md shadow-sm border border-gray-100'
            }
          `}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words relative">
            {message.content}
            {/* 流式输出中的光标 */}
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-gray-400 ml-0.5 animate-pulse" />
            )}
          </p>
        </div>
        
        {/* 时间戳 */}
        <p className={`text-xs text-gray-400 mt-1 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
      
      {/* 用户头像 */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-pink-500 flex-shrink-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">我</span>
        </div>
      )}
      
      {/* 隐藏的音频元素 */}
      {message.audioUrl && (
        <audio
          ref={audioRef}
          src={message.audioUrl}
          preload="metadata"
        />
      )}
    </div>
  );
}

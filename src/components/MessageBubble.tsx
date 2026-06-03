'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Character, ChatMessage } from '@/types';
import { Loader2, Pause, Play } from 'lucide-react';

interface MessageBubbleProps {
  message: ChatMessage;
  character: Character;
  onImageClick: () => void;
}

const assistantAudioCache = new Map<string, string>();

function sanitizeTextForTts(text: string): string {
  return text
    .replace(/（[^（）]*）/g, ' ')
    .replace(/\([^()]*\)/g, ' ')
    .replace(/【[^【】]*】/g, ' ')
    .replace(/\[[^\[\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function MessageBubble({ message, character, onImageClick }: MessageBubbleProps) {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const isUser = message.direction === 'user';
  const isAssistantText =
    !isUser &&
    message.type === 'text' &&
    !message.isStreaming &&
    Boolean(message.content.trim());
  const audioCacheKey = `${character.id}:${message.id}`;

  useEffect(() => {
    return () => {
      activeAudioRef.current?.pause();
      activeAudioRef.current = null;
    };
  }, []);

  const handlePlayVoice = async () => {
    if (!isAssistantText || isGeneratingAudio) return;

    if (isPlaying) {
      activeAudioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    try {
      let audioUrl = assistantAudioCache.get(audioCacheKey);

      if (!audioUrl) {
        const ttsText = sanitizeTextForTts(message.content);
        if (!ttsText) {
          console.warn('TTS text is empty after sanitization');
          return;
        }

        setIsGeneratingAudio(true);

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: ttsText,
            characterId: character.id,
          }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.detail || data?.error || 'TTS request failed');
        }

        if (typeof data?.audioUrl !== 'string' || !data.audioUrl) {
          throw new Error('TTS response missing audioUrl');
        }

        const generatedAudioUrl = data.audioUrl;
        audioUrl = generatedAudioUrl;
        assistantAudioCache.set(audioCacheKey, generatedAudioUrl);
      }

      activeAudioRef.current?.pause();

      if (!audioUrl) {
        throw new Error('TTS audioUrl cache miss');
      }

      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      audio.addEventListener('ended', () => setIsPlaying(false), { once: true });
      audio.addEventListener('error', () => setIsPlaying(false), { once: true });

      setIsPlaying(true);
      await audio.play();
    } catch (error) {
      setIsPlaying(false);
      console.warn('Voice playback failed:', error);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  if (message.type === 'image' && message.imageUrl) {
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}>
        {!isUser && <CharacterAvatar character={character} />}

        <div className="inline-flex max-w-[min(240px,70vw)]">
          <div
            className="inline-block max-h-[320px] max-w-[min(240px,70vw)] cursor-pointer overflow-hidden rounded-2xl shadow-sm transition-opacity hover:opacity-95"
            onClick={onImageClick}
          >
            <Image
              src={message.imageUrl}
              alt=""
              width={240}
              height={320}
              className="block h-auto max-h-[320px] w-auto max-w-[min(240px,70vw)] rounded-2xl object-cover"
              unoptimized
            />
          </div>
        </div>

        {isUser && <UserAvatar />}
      </div>
    );
  }

  if (message.isStreaming && !message.content) {
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}>
        {!isUser && <CharacterAvatar character={character} />}

        <div className="rounded-2xl rounded-bl-md border border-gray-100 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!message.content?.trim() && !message.imageUrl) {
    return null;
  }

  const isStreaming = message.isStreaming && message.content;

  return (
    <div className={`relative flex ${isUser ? 'justify-end' : 'justify-start'} items-end gap-2`}>
      {!isUser && <CharacterAvatar character={character} />}

      <div className={`relative max-w-xs sm:max-w-md ${isUser ? 'order-1' : ''}`}>
        {isAssistantText && (
          <button
            type="button"
            onClick={handlePlayVoice}
            disabled={isGeneratingAudio}
            className={`
              absolute -left-2 -top-2.5 z-20
              flex items-center gap-1.5 rounded-full border border-gray-100
              bg-white/85 py-1 pl-2 pr-3 text-xs font-medium text-gray-600
              shadow-sm shadow-gray-200/80 backdrop-blur-md transition-all duration-200
              hover:bg-white
              ${isGeneratingAudio ? 'cursor-wait opacity-80' : 'cursor-pointer'}
              ${isPlaying ? 'ring-2 ring-pink-200' : ''}
            `}
            title={isGeneratingAudio ? '生成中' : isPlaying ? '播放中' : '播放语音'}
          >
            <span className="flex h-5 w-5 items-center justify-center">
              {isGeneratingAudio ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
              ) : isPlaying ? (
                <Pause className="h-3.5 w-3.5 fill-pink-500 text-pink-500" />
              ) : (
                <Play className="ml-0.5 h-3.5 w-3.5 fill-pink-500 text-pink-500" />
              )}
            </span>
            <span>{isGeneratingAudio ? '生成中' : isPlaying ? '播放中' : '播放语音'}</span>
          </button>
        )}

        <div
          className={`
            min-h-[44px] px-4 pb-3 pt-4
            ${
              isUser
                ? 'rounded-2xl rounded-br-md bg-pink-500 text-white'
                : 'rounded-2xl rounded-bl-md border border-gray-100 bg-white text-gray-800 shadow-sm'
            }
          `}
        >
          <p className="relative whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-gray-400" />
            )}
          </p>
        </div>

        <p className={`mt-1 text-xs text-gray-400 ${isUser ? 'text-right' : ''}`}>
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {isUser && <UserAvatar />}
    </div>
  );
}

function CharacterAvatar({ character }: { character: Character }) {
  return (
    <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-gray-200">
      <Image
        src={`/images/characters/${character.id}.jpg`}
        alt={character.name}
        fill
        className="object-cover"
        unoptimized
      />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-pink-500">
      <span className="text-sm font-bold text-white">我</span>
    </div>
  );
}

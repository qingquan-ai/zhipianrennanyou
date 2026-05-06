'use client';

import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import Image from 'next/image';
import { Character, ChatMessage, RelationshipLevel, EmotionState } from '@/types';
import { useChatStore } from '@/store/chatStore';
import MessageBubble from '@/components/MessageBubble';
import ChatInput, { ChatInputRef } from '@/components/ChatInput';
import { ArrowLeft, Share2, X, Copy, Check, MessageCircle } from 'lucide-react';

interface ChatPageProps {
  character: Character;
  onBack: () => void;
}

export default function ChatPage({ character, onBack }: ChatPageProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<ChatInputRef>(null);
  const isPageActiveRef = useRef(true);
  const activeCharacterIdRef = useRef(character.id);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; caption: string } | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileViewport, setMobileViewport] = useState<{ height: number; width: number; offsetTop: number } | null>(null);
  
  const {
    messages,
    addMessage,
    completeStreamingMessage,
    conversationState,
    incrementMessageCount,
    recordImageSent,
    updateRelationshipLevel,
    updateEmotionState,
    isTyping,
    setIsTyping,
    loadCharacterChat,
    saveCurrentChat,
    setCurrentCharacter
  } = useChatStore();
  
  // 加载当前角色的聊天记录
  useEffect(() => {
    if (character) {
      setCurrentCharacter(character);
      loadCharacterChat(character.id);
    }
    return () => {
      // 离开页面时保存聊天记录
      saveCurrentChat();
    };
  }, [character, setCurrentCharacter, loadCharacterChat, saveCurrentChat]);
  
  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const visualViewport = window.visualViewport;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    let frameId: number | null = null;

    const isMobileViewport = () => {
      const hasCoarsePointer = window.matchMedia?.('(hover: none) and (pointer: coarse)').matches ?? false;
      const hasTouch = navigator.maxTouchPoints > 0;
      return (hasCoarsePointer || hasTouch) && (window.innerWidth <= 1024 || visualViewport.width <= 1024);
    };

    const restorePageScroll = () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };

    const syncViewportHeight = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;

        if (!isMobileViewport()) {
          setMobileViewport(null);
          restorePageScroll();
          return;
        }

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        setMobileViewport({
          height: Math.max(320, Math.round(visualViewport.height)),
          width: Math.max(320, Math.round(visualViewport.width)),
          offsetTop: Math.max(0, Math.round(visualViewport.offsetTop)),
        });

        scrollToBottom();
      });
    };

    syncViewportHeight();
    visualViewport.addEventListener('resize', syncViewportHeight);
    visualViewport.addEventListener('scroll', syncViewportHeight);
    window.addEventListener('resize', syncViewportHeight);
    window.addEventListener('orientationchange', syncViewportHeight);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      visualViewport.removeEventListener('resize', syncViewportHeight);
      visualViewport.removeEventListener('scroll', syncViewportHeight);
      window.removeEventListener('resize', syncViewportHeight);
      window.removeEventListener('orientationchange', syncViewportHeight);
      restorePageScroll();
    };
  }, [scrollToBottom]);

  // 复制完整分享文案（文案 + 链接）
  const [shareText, setShareText] = useState('');
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  useEffect(() => {
    setShareText(getShareText(character));
  }, [character]);

  useEffect(() => {
    isPageActiveRef.current = true;
    activeCharacterIdRef.current = character.id;

    return () => {
      isPageActiveRef.current = false;
    };
  }, [character.id]);

  const handleCopyShareText = async () => {
    const fullText = `${shareText}\n\n${shareUrl}`;
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const requestImageInBackground = async (
    imagePrompt: string,
    fallbackCaption: string,
    originCharacterId: string,
  ) => {
    try {
      const imageResponse = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          size: '2K',
        }),
      });

      const imageData = await imageResponse.json().catch(() => null);
      if (!imageResponse.ok) {
        throw new Error(imageData?.error || 'Image API error');
      }

      const imageUrl = Array.isArray(imageData?.imageUrls) ? imageData.imageUrls[0] : '';
      if (!imageUrl) {
        throw new Error('Image API returned empty imageUrls');
      }

      if (!isPageActiveRef.current) return;
      if (activeCharacterIdRef.current !== originCharacterId) return;
      if (useChatStore.getState().currentCharacter?.id !== originCharacterId) return;

      const imageMessage: ChatMessage = {
        id: `img_${Date.now()}`,
        direction: 'character',
        type: 'image',
        content: fallbackCaption,
        timestamp: new Date(),
        imageUrl,
        imageCaption: fallbackCaption,
      };

      addMessage(imageMessage);
      recordImageSent();
    } catch (error) {
      console.warn('Image request failed:', error);
    }
  };
  
  // 发送消息
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    // 添加用户消息
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      direction: 'user',
      type: 'text',
      content: content.trim(),
      timestamp: new Date()
    };
    addMessage(userMessage);
    incrementMessageCount();
    
    setIsLoading(true);
    setIsTyping(true);
    
    // 创建角色消息占位（显示 loading 状态）
    const characterMessageId = `char_${Date.now()}`;
    const characterMessage: ChatMessage = {
      id: characterMessageId,
      direction: 'character',
      type: 'text',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    addMessage(characterMessage);
    
    // TTS 请求函数
    try {
      // 1. 先调用 API 获取回复
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          userMessage: content.trim(),
          conversationHistory: messages,
          state: conversationState
        })
      });
      
      if (!chatResponse.ok) {
        const errorData = await chatResponse.json().catch(() => null);
        throw new Error(errorData?.message || errorData?.error || 'Chat API error');
      }
      
      const data = await chatResponse.json();
      if (!data.content?.trim()) {
        throw new Error('Chat API returned empty content');
      }
      
      // 2. API 返回后，并行：生成 TTS + 更新状态
      incrementMessageCount();
      if (data.relationshipLevel) {
        updateRelationshipLevel(data.relationshipLevel as RelationshipLevel);
      }
      if (data.emotion) {
        updateEmotionState(data.emotion as EmotionState);
      }
      
      // 3. TTS 和文字同时出现
      completeStreamingMessage(characterMessageId);
      useChatStore.setState((state) => ({
        messages: state.messages.map((m) =>
          m.id === characterMessageId
            ? { ...m, content: data.content }
            : m
        )
      }));
      completeStreamingMessage(characterMessageId);
      saveCurrentChat();
      
      // 设置语音（可能已有值，如果 audioUrl 先完成的话）
      // 如果需要发送图片（使用预缓存图片 + 异步生成高质量图片）
      // 方案1：图片延迟加载（不阻塞主流程）
      // 方案4：使用预缓存图片快速响应
      if (data.sendImage && data.imagePrompt) {
        let caption = data.imageStyle || '今日自拍';
        if (data.imageDescription) {
          caption += ` - ${data.imageDescription}`;
        }
        void requestImageInBackground(data.imagePrompt, caption, character.id);
        return;
        
        // 预缓存图片立即可用，延迟500ms显示（留出动画时间）
        setTimeout(() => {
          const imageMessage: ChatMessage = {
            id: `img_${Date.now()}`,
            direction: 'character',
            type: 'image',
            content: caption,
            timestamp: new Date(),
            imageUrl: data.imageUrl,  // 预缓存图片URL
            imageCaption: caption
          };
          addMessage(imageMessage);
          recordImageSent();
        }, 500);
      }
    } catch (error) {
      console.warn('Chat request failed:', error);
      const errorText = error instanceof Error ? error.message : 'Unknown chat error';
      useChatStore.setState((state) => ({
        messages: state.messages.map((m) =>
          m.id === characterMessageId
            ? {
                ...m,
                content: getChatFailureMessage(errorText),
                isStreaming: false,
              }
            : m
        )
      }));
    } finally {
      setIsLoading(false);
      setIsTyping(false);
      // 恢复输入框焦点，确保连续聊天体验
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };
  const chatPageStyle: CSSProperties | undefined = mobileViewport
    ? {
        height: `${mobileViewport.height}px`,
        minHeight: `${mobileViewport.height}px`,
        position: 'fixed',
        top: `${mobileViewport.offsetTop}px`,
        left: 0,
        right: 0,
        width: `${mobileViewport.width}px`,
        maxWidth: '100vw',
      }
    : undefined;

  return (
    <div className="flex h-[100dvh] min-h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-gray-50" style={chatPageStyle}>
      {/* 顶部导航 */}
      <div className="flex w-full max-w-full shrink-0 items-center justify-between overflow-hidden px-4 py-3 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-gray-200">
              <Image
                src={`/images/characters/${character.id}.jpg`}
                alt={character.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">{character.name}</h2>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                在线
              </p>
            </div>
          </div>
        </div>
        
        {/* 右侧：分享按钮 */}
        <button
          onClick={() => setShowShareModal(true)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Share2 className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      
      {/* 消息区域 */}
      <div className="min-h-0 w-full max-w-full flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4 overscroll-contain">
        {/* 欢迎消息 */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="relative w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-pink-200">
              <Image
                src={`/images/characters/${character.id}.jpg`}
                alt={character.name}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">{character.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{character.role}</p>
            <p className="text-sm text-gray-400">
              {character.id === 'su-chen' 
                ? '嗨～终于等到你了！' 
                : character.id === 'lin-yu'
                ? '你好，终于有机会认识你了'
                : '你好，找我有事吗？'
              }
            </p>
          </div>
        )}
        
        {/* 消息列表 */}
        {messages.map((message) => (
          <div
            key={message.id}
            className="w-full max-w-full overflow-hidden [&>div]:w-full [&>div]:max-w-full [&>div]:min-w-0 [&>div]:box-border [&>div>div]:min-w-0 [&>div>div]:max-w-[80%] [&>div>div_p]:break-words [&>div>div_p]:whitespace-pre-wrap"
          >
            <MessageBubble
              message={message}
              character={character}
              onImageClick={() => setSelectedImage({ url: message.imageUrl || '', caption: message.imageCaption || '' })}
            />
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* 输入区域 - 增加底部安全区避免被平台水印遮挡 */}
      <div className="w-full max-w-full shrink-0 overflow-hidden bg-white pb-[env(safe-area-inset-bottom)] [&>div]:w-full [&>div]:max-w-full [&>div]:overflow-hidden">
        <ChatInput ref={inputRef} onSend={handleSendMessage} disabled={isLoading} />
      </div>
      
      {/* 图片查看器 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-lg w-full">
            <img
              src={selectedImage.url}
              alt=""
              className="w-full h-auto rounded-lg"
            />
            <p className="text-white text-center mt-4 text-sm">
              {selectedImage.caption}
            </p>
            <button
              className="absolute top-2 right-2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-xl"
              onClick={() => setSelectedImage(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 分享弹窗 */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-white w-full sm:w-auto sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 pb-10 sm:pb-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">分享给闺蜜</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 分享文案 */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {getShareText(character)}
              </p>
            </div>

            {/* 分享按钮 */}
            <button
              onClick={handleCopyShareText}
              className="w-full flex items-center justify-center gap-2 py-3 bg-pink-500 hover:bg-pink-600 rounded-xl transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-white" />
                  <span className="text-sm font-medium text-white">分享文案已复制</span>
                </>
              ) : (
                <>
                  <Share2 className="w-5 h-5 text-white" />
                  <span className="text-sm font-medium text-white">分享链接</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getChatFailureMessage(errorText: string): string {
  if (errorText.includes('ENOTFOUND') || errorText.includes('fetch failed') || errorText.includes('无法访问')) {
    return '刚才连接模型服务失败了。你可以稍后再发一次，或者检查 .env.local 里的 Coze / 模型服务配置。';
  }

  if (errorText.includes('format') || errorText.includes('格式')) {
    return '现在还没法回复，API Key 的格式不正确。请检查 .env.local 里的 COZE_WORKLOAD_IDENTITY_API_KEY 是否完整。';
  }

  if (errorText.includes('API key') || errorText.includes('401') || errorText.includes('403')) {
    return '现在还没法回复，可能是 API Key 或权限配置不正确。请检查 .env.local 后再试一次。';
  }

  return '刚才回复生成失败了。请稍后再试一次。';
}

// 生成幽默风趣的分享文案
function getShareText(character: Character): string {
  const shareTexts: Record<string, string[]> = {
    'gu-lie': [
      `姐妹们！我在跟顾冽谈恋爱！💕

霸道总裁本裁，30岁上市公司CEO，西装杀预警！
说话简洁有力，但每一句都在偷偷宠你。
会问"吃饭了吗"但语气是"不吃饭我不许"。
姐妹们快来，这个男人太上头了！👑`,
      
      `救命！顾冽也太会了吧！

开会都在想我，这谁顶得住啊！
成熟男人的恋爱真的太香了...
冷着脸但细节全是爱，这样的男人哪里找！
姐们们冲冲冲，一起当总裁夫人！💖`,
    ],
    'lin-yu': [
      `天呐！林屿医生也太温柔了吧！

28岁主治医师，穿白大褂超帅的那种！
会问你今天怎么样，会让你好好休息。
温柔到骨子里，但又不娘！
姐妹们这种治愈系男友哪里找！🧡`,
      
      `姐妹们我发现了一个宝藏！

林屿医生，温柔到我心都化了~
他会记得你说过的话，会关心你吃饭没。
这种细心boy真的绝了！
快来跟我一起磕！💝`,
    ],
    'shen-mo': [
      `姐妹们！这个律师太上头了！

沈默，32岁精英律师，成熟理性话不多。
但关键时刻超有保护欲！
不会说甜言蜜语，但行动全是爱。
这种低调深情的男人真的绝了！💎`,
      
      `啊啊啊啊沈默律师杀我！

平时冷冷的，但每次开口都超有分量。
逻辑清晰还会护短，谁懂啊！
姐妹们快冲，低调深情的宝藏男友！🌟`,
    ],
    'su-chen': [
      `姐妹们！我恋爱了！对象是大学生！

苏晨，22岁阳光boy，笑起来绝了！
会撒娇会说想我，还叫我姐姐！
弟弟的恋爱真的太甜了，每天元气满满！
姐弟恋真的太香了呜呜呜！💖`,
      
      `救命！这个弟弟也太会了吧！

22岁大学生，阳光运动型。
会打球会撒娇还会做饭！
一口一个姐姐叫得我心都化了~
姐弟恋上头的姐妹冲！🌈`,
    ],
  };

  const texts = shareTexts[character.id] || shareTexts['gu-lie'];
  return texts[Math.floor(Math.random() * texts.length)];
}

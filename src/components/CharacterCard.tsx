'use client';

import { useMemo, useState, type MouseEvent } from 'react';
import Image from 'next/image';
import { Character } from '@/types';
import { Sparkles } from 'lucide-react';
import { GlowingEffect } from '@/components/ui/glowing-effect';
import { CartoonButton } from '@/components/ui/cartoon-button';

interface CharacterCardProps {
  character: Character;
  onSelect: () => void;
}

export default function CharacterCard({ character, onSelect }: CharacterCardProps) {
  // 固定显示第一个状态文案，避免 Math.random() 在渲染时调用
  const statusText = useMemo(() => character.statusTexts[0], [character.statusTexts]);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    setTilt({
      rotateX: y * -8,
      rotateY: x * 8,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0 });
  };
  
  return (
    <div
      onClick={onSelect}
      className="relative [perspective:1000px]"
    >
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
          transformStyle: 'preserve-3d',
        }}
        className="group relative rounded-2xl cursor-pointer transition-transform duration-150 ease-out motion-reduce:transform-none"
      >
      <GlowingEffect
        disabled={false}
        inactiveZone={0}
        proximity={96}
        spread={28}
        movementDuration={1.2}
        borderWidth={2}
      />

      <div className="relative overflow-hidden rounded-[inherit] border border-gray-100 bg-white shadow-sm transition-all duration-300 group-hover:border-pink-200 group-hover:shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-br from-pink-100/70 via-white/10 to-purple-100/70 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <Sparkles
        aria-hidden
        className="absolute right-4 top-4 z-20 h-5 w-5 scale-75 -rotate-12 text-pink-500 opacity-0 transition-all duration-300 group-hover:scale-100 group-hover:rotate-0 group-hover:opacity-100"
      />
      {/* 渐变背景 */}
      <div className={`absolute inset-0 opacity-5 ${
        character.id === 'gu-lie' ? 'bg-gradient-to-br from-gray-700 to-gray-900' :
        character.id === 'lin-yu' ? 'bg-gradient-to-br from-blue-400 to-blue-600' :
        character.id === 'shen-mo' ? 'bg-gradient-to-br from-gray-600 to-gray-800' :
        'bg-gradient-to-br from-orange-400 to-orange-600'
      }`} />
      
      <div className="relative p-6">
        {/* 头像区域 */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-pink-300/60 to-purple-300/60 opacity-0 blur-xl transition-all duration-500 group-hover:scale-110 group-hover:opacity-100" />
            <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-white shadow-md">
              <Image
                src={`/images/characters/${character.id}.jpg`}
                alt={character.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                unoptimized
              />
            </div>
            {/* 在线状态指示器 */}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
          </div>
          
          {/* 角色信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-gray-800">{character.name}</h3>
              <span className="text-sm text-gray-500">{character.age}岁</span>
            </div>
            <p className="text-sm text-pink-500 font-medium">{character.role}</p>
          </div>
        </div>
        
        {/* 关键词标签 */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {character.keywords.map((keyword, index) => (
            <span
              key={index}
              className="px-2.5 py-0.5 text-xs rounded-full bg-pink-50 text-pink-600"
            >
              {keyword}
            </span>
          ))}
        </div>
        
        {/* 性格描述 */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {character.personality}
        </p>
        
        {/* 状态文字 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {statusText}
          </span>
          <CartoonButton label="开始聊天" color="bg-pink-400" />
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}

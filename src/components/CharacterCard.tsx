'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { Character } from '@/types';
import { Heart } from 'lucide-react';

interface CharacterCardProps {
  character: Character;
  onSelect: () => void;
}

export default function CharacterCard({ character, onSelect }: CharacterCardProps) {
  // 固定显示第一个状态文案，避免 Math.random() 在渲染时调用
  const statusText = useMemo(() => character.statusTexts[0], [character.statusTexts]);
  
  return (
    <div
      onClick={onSelect}
      className="group relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100 hover:border-pink-200"
    >
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
          <div className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-md">
            <Image
              src={`/images/characters/${character.id}.jpg`}
              alt={character.name}
              fill
              className="object-cover"
              unoptimized
            />
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
          <button
            className="flex items-center gap-1.5 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium rounded-full transition-colors"
          >
            <Heart className="w-4 h-4" />
            开始聊天
          </button>
        </div>
      </div>
    </div>
  );
}

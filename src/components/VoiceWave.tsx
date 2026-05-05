'use client';

import { memo } from 'react';

interface VoiceWaveProps {
  isActive: boolean;
}

function VoiceWave({ isActive }: VoiceWaveProps) {
  if (!isActive) return null;

  return (
    <div className="flex items-center gap-1 ml-2">
      <span className="voice-bar w-0.5 h-4 bg-pink-500 rounded-full voice-wave" />
      <span className="voice-bar w-0.5 h-6 bg-pink-500 rounded-full voice-wave" />
      <span className="voice-bar w-0.5 h-3 bg-pink-500 rounded-full voice-wave" />
      <span className="voice-bar w-0.5 h-5 bg-pink-500 rounded-full voice-wave" />
      <span className="voice-bar w-0.5 h-4 bg-pink-500 rounded-full voice-wave" />
    </div>
  );
}

export default memo(VoiceWave);

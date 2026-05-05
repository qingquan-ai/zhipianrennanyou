import { NextRequest, NextResponse } from 'next/server';
import { TTSClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import axios from 'axios';
import { getCharacterById } from '@/lib/characters';

export async function POST(request: NextRequest) {
  try {
    const { text, characterId } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    
    const character = characterId ? getCharacterById(characterId) : null;
    
    const config = new Config({
      apiKey: process.env.COZE_WORKLOAD_API_TOKEN || process.env.COZE_WORKLOAD_IDENTITY_API_KEY,
      baseUrl: process.env.COZE_INTEGRATION_BASE_URL,
      modelBaseUrl: process.env.COZE_INTEGRATION_MODEL_BASE_URL,
    });
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new TTSClient(config, customHeaders);
    
    // 使用角色对应的音色
    const speaker = character?.ttsSpeaker || 'zh_male_m191_uranus_bigtts';
    const speechRate = character?.speechRate || 0;
    
    const response = await client.synthesize({
      uid: `tts_${Date.now()}`,
      text: text,
      speaker: speaker,
      audioFormat: 'mp3',
      sampleRate: 24000,
      speechRate: speechRate,
      loudnessRate: 0
    });
    
    return NextResponse.json({
      audioUrl: response.audioUri,
      audioSize: response.audioSize
    });
    
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'TTS synthesis failed' }, { status: 500 });
  }
}

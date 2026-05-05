import { NextRequest, NextResponse } from 'next/server';
import { ASRClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }
    
    // 读取音频文件并转换为 base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');
    
    const config = new Config();
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const client = new ASRClient(config, customHeaders);
    
    const result = await client.recognize({
      uid: `asr_${Date.now()}`,
      base64Data: base64Data
    });
    
    return NextResponse.json({
      text: result.text,
      duration: result.duration
    });
    
  } catch (error) {
    console.error('ASR error:', error);
    return NextResponse.json({ error: 'Speech recognition failed' }, { status: 500 });
  }
}

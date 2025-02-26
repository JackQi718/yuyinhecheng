import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID;

const BASE_CONCURRENT_LIMIT = 3;     // 基础并发数
const VIP_MULTIPLIER = 2;           // 会员倍数
const ANONYMOUS_LIMIT = 1;          // 匿名用户限制

// 创建并发限制器
const limiter = rateLimit({
  interval: 1000,
  getMaxRequests: async (userId: string) => {
    // 匿名用户只允许1个并发请求
    if (userId === 'anonymous') return ANONYMOUS_LIMIT;
    
    // 查询用户的订阅状态
    const user = await prisma.users.findFirst({
      where: { email: userId },
      include: { subscription: true }
    });

    // 如果用户有活跃的订阅，给予双倍并发限制
    const isVip = user?.subscription && 
                 new Date(user.subscription.endDate) > new Date() &&
                 user.subscription.status === 'active';

    return isVip ? BASE_CONCURRENT_LIMIT * VIP_MULTIPLIER : BASE_CONCURRENT_LIMIT;
  }
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.email || 'anonymous';

    // 应用基于用户的并发限制
    await limiter.acquire(userId);

    const { text, language, voiceId } = await req.json();
    
    // 详细的请求日志
    console.log('API Request:', {
      text,
      language,
      groupId: MINIMAX_GROUP_ID,
      apiKeyLength: MINIMAX_API_KEY?.length
    });

    const requestBody = {
      model: 'speech-01-turbo',
      text,
      timber_weights: [
        {
          voice_id: voiceId,
          weight: 100
        }
      ],
      voice_setting: {
        voice_id: "",
        speed: 1,
        pitch: 0,
        vol: 1,
        latex_read: false
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: "mp3"
      },
      language_boost: "auto"
    };

    const url = `https://api.minimax.chat/v1/t2a_v2?GroupId=${MINIMAX_GROUP_ID}`;
    console.log('Making request to:', url);

    // 使用 AbortController 设置超时
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15秒超时

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      
      try {
        const jsonResponse = JSON.parse(responseText);
        if (jsonResponse.base_resp?.status_code === 0 && jsonResponse.data?.audio) {
          // 将Base64音频数据转换为Buffer
          const audioBuffer = Buffer.from(jsonResponse.data.audio, 'hex');
          return new NextResponse(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mp3',
              'Content-Length': audioBuffer.length.toString(),
              'Cache-Control': 'public, max-age=86400' // 24小时缓存
            },
          });
        }
        throw new Error(jsonResponse.base_resp?.status_msg || '语音生成失败');
      } catch (parseError) {
        console.error('Parse error:', parseError);
        console.error('Response:', responseText);
        throw new Error('无效的音频数据');
      }

    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        throw new Error('请求超时');
      }
      throw fetchError;
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '语音生成失败' },
      { status: 500 }
    );
  } finally {
    const session = await getServerSession();
    const userId = session?.user?.email || 'anonymous';
    limiter.release(userId);
  }
} 
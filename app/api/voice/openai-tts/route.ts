import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { openai, TTS_MODEL } from '@/lib/openai';
import { createId } from '@paralleldrive/cuid2';
import { rateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 并发限制配置
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

// 错误消息
const ERROR_MESSAGES = {
  openaiConfigError: 'OpenAI configuration error',
  insufficientCredits: '字符配额不足',
  textRequired: '请输入要转换的文本',
  ttsError: 'TTS 转换错误',
  invalidVoice: '无效的声音选项',
  noText: '请输入要转换的文本'
};

export async function POST(request: Request) {
  let userEmail: string | undefined;
  
  try {
    console.log('Starting OpenAI TTS process...');
    
    // 检查API密钥是否配置
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key is not set');
      return NextResponse.json({ error: ERROR_MESSAGES.openaiConfigError }, { status: 500 });
    }
    
    // 获取会话，但不强制要求登录
    const session = await getServerSession(authOptions);
    userEmail = session?.user?.email || 'anonymous';

    // 应用基于用户的并发限制
    try {
      await limiter.acquire(userEmail);
    } catch (error) {
      console.error('并发限制错误:', error);
      return NextResponse.json({ error: '请求过于频繁，请稍后再试' }, { status: 429 });
    }

    // 解析请求体
    const { text, voice = 'alloy', speed = 1.0 } = await request.json();

    // 验证必需参数
    if (!text) {
      console.log('No text provided');
      return NextResponse.json({ error: ERROR_MESSAGES.noText }, { status: 400 });
    }

    // 验证声音选项
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'ash', 'coral', 'ballad', 'sage'];
    if (!validVoices.includes(voice)) {
      console.log('Invalid voice option');
      return NextResponse.json({ error: ERROR_MESSAGES.invalidVoice }, { status: 400 });
    }

    console.log(`Converting text to speech with OpenAI, voice: ${voice}, length: ${text.length} characters`);
    
    // 调用 OpenAI TTS API，添加重试逻辑
    let mp3Response;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1秒

    while (retryCount <= maxRetries) {
      try {
        mp3Response = await openai.audio.speech.create({
          model: TTS_MODEL,
          voice: voice,
          input: text,
          speed: speed
        });
        break; // 成功则跳出循环
      } catch (error: any) {
        retryCount++;
        console.error(`TTS API 调用失败 (尝试 ${retryCount}/${maxRetries}):`, error.message);
        
        if (retryCount > maxRetries || 
            (error.status && error.status !== 429 && error.status !== 500 && error.status !== 503)) {
          // 如果不是临时错误或已达到最大重试次数，则抛出错误
          throw error;
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
      }
    }

    if (!mp3Response) {
      throw new Error('无法连接到OpenAI服务');
    }

    // 获取音频数据
    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    
    // 生成唯一的文件名
    const fileName = `${createId()}.mp3`;
    
    console.log('TTS process completed successfully');
    
    // 返回音频数据
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('TTS process error:', error);
    
    // 根据错误类型返回不同的错误信息
    if (error.name === 'APIConnectionError') {
      return NextResponse.json({ 
        error: '连接OpenAI服务失败，请检查网络连接或稍后再试',
        details: error.message,
        errorType: 'connection_error'
      }, { status: 503 });
    } else if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ 
        error: 'OpenAI API密钥无效或权限不足',
        details: error.message,
        errorType: 'auth_error'
      }, { status: error.status });
    } else if (error.status === 429) {
      return NextResponse.json({ 
        error: 'OpenAI API请求过于频繁，请稍后再试',
        details: error.message,
        errorType: 'rate_limit_error'
      }, { status: 429 });
    }
    
    return NextResponse.json({ 
      error: ERROR_MESSAGES.ttsError,
      details: error.message,
      errorType: 'general_error'
    }, { status: 500 });
  } finally {
    // 释放并发限制
    if (userEmail) {
      limiter.release(userEmail);
    }
  }
}

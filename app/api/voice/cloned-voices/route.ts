import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { t } from '@/lib/i18n';
import { createId } from '@paralleldrive/cuid2';

// 获取用户的所有克隆声音
export async function GET() {
  try {
    console.log('开始获取克隆语音列表...');
    
    const session = await getServerSession(authOptions);
    console.log('会话信息:', session?.user ? { 
      id: session.user.id, 
      email: session.user.email 
    } : 'No session');

    if (!session?.user) {
      console.log('未授权访问: 用户未登录');
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    if (!session?.user?.email) {
      console.log('无效的用户邮箱');
      return NextResponse.json({ error: '无效的用户邮箱' }, { status: 400 });
    }

    // 先查询用户
    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      console.log('未找到用户');
      return NextResponse.json({ error: '未找到用户' }, { status: 404 });
    }

    console.log('查询用户克隆语音, 用户ID:', user.id);
    
    try {
      const voices = await prisma.clonedVoice.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log('查询结果:', voices ? `找到 ${voices.length} 个克隆语音` : '未找到克隆语音');
      return NextResponse.json(voices || []);
      
    } catch (dbError) {
      console.error('数据库查询错误:', dbError);
      return NextResponse.json(
        { error: '数据库查询失败，请稍后重试' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('获取克隆语音列表错误:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
    
    return NextResponse.json(
      { error: '获取克隆语音列表失败，请稍后重试' },
      { status: 500 }
    );
  }
}

// 添加新的克隆声音
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: t('loginRequired') }, { status: 401 });
    }

    if (!session?.user?.email) {
      return NextResponse.json({ error: '无效的用户邮箱' }, { status: 400 });
    }

    // 先查询用户
    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: '未找到用户' }, { status: 404 });
    }

    const { voiceId, name } = await request.json();

    if (!voiceId) {
      return NextResponse.json({ error: '无效的声音ID' }, { status: 400 });
    }

    const voice = await prisma.clonedVoice.create({
      data: {
        id: createId(),
        userId: user.id,
        voiceId,
        name: name || t('defaultClonedVoiceName', { date: new Date().toLocaleString() })
      }
    });

    return NextResponse.json(voice);
  } catch (error) {
    console.error(t('saveCloneVoiceError'), error);
    return NextResponse.json(
      { error: t('saveCloneVoiceError') },
      { status: 500 }
    );
  }
}

// 删除克隆声音
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: t('loginRequired') }, { status: 401 });
    }

    if (!session?.user?.email) {
      return NextResponse.json({ error: '无效的用户邮箱' }, { status: 400 });
    }

    // 先查询用户
    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: '未找到用户' }, { status: 404 });
    }

    const { id } = await request.json();

    await prisma.clonedVoice.deleteMany({
      where: {
        id,
        userId: user.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(t('deleteCloneVoiceError'), error);
    return NextResponse.json(
      { error: t('deleteCloneVoiceError') },
      { status: 500 }
    );
  }
} 
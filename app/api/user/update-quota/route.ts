import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    console.log('开始更新字符使用量...');
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const { usedCharacters } = await req.json();
    console.log('使用字符数：', usedCharacters);

    // 查找用户
    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        characterQuota: {
          select: {
            id: true,
            permanentQuota: true,
            temporaryQuota: true,
            usedCharacters: true,
            quotaExpiry: true,
            lastUpdated: true
          }
        }
      }
    });

    if (!user || !user.characterQuota) {
      console.log('未找到用户配额信息');
      return NextResponse.json(
        { error: '未找到用户配额信息' },
        { status: 404 }
      );
    }

    console.log('当前用户配额信息：', user.characterQuota);

    // 更新字符使用量
    const updatedQuota = await prisma.characterQuota.update({
      where: { userId: user.id },
      data: {
        usedCharacters: {
          increment: usedCharacters
        },
        lastUpdated: new Date()
      }
    });

    console.log('更新后的配额信息：', updatedQuota);

    return NextResponse.json({
      success: true,
      updatedQuota
    });

  } catch (error) {
    console.error('更新字符使用量失败：', error);
    return NextResponse.json(
      { 
        error: '更新字符使用量失败',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : 
          undefined
      },
      { status: 500 }
    );
  }
} 
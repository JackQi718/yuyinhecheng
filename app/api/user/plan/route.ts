import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    console.log('开始获取用户计划信息...');
    
    const session = await getServerSession(authOptions);
    console.log('会话信息：', JSON.stringify(session, null, 2));

    if (!session?.user?.email) {
      console.log('未找到用户会话');
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 查找用户
    console.log('查找用户：', session.user.email);
    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        subscription: {
          select: {
            id: true,
            planType: true,
            startDate: true,
            endDate: true,
            status: true
          }
        },
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
      },
    });
    console.log('用户信息：', JSON.stringify(user, null, 2));

    if (!user) {
      console.log('用户不存在');
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 如果已经有订阅和配额信息，直接返回
    if (user.subscription && user.characterQuota) {
      return NextResponse.json({
        subscription: user.subscription,
        characterQuota: user.characterQuota,
      });
    }

    try {
      let subscription = user.subscription;
      let characterQuota = user.characterQuota;

      // 如果没有找到配额记录，创建一个默认的
      if (!characterQuota) {
        console.log('创建默认配额...');
        characterQuota = await prisma.characterQuota.create({
          data: {
            id: crypto.randomUUID(),
            userId: user.id,
            permanentQuota: 0,
            temporaryQuota: 10000,
            usedCharacters: 0,
            quotaExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
            lastUpdated: new Date(),
          },
        });
        console.log('新建配额信息：', JSON.stringify(characterQuota, null, 2));
      }

      // 如果没有找到订阅记录，创建一个默认的试用订阅
      if (!subscription) {
        console.log('创建默认订阅...');
        subscription = await prisma.subscription.create({
          data: {
            id: crypto.randomUUID(),
            userId: user.id,
            planType: 'trial',
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'active',
          },
        });
        console.log('新建订阅信息：', JSON.stringify(subscription, null, 2));
      }

      return NextResponse.json({
        subscription,
        characterQuota,
      });

    } catch (error) {
      console.error('数据库操作错误：', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }

  } catch (error) {
    console.error('获取用户计划失败：', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return NextResponse.json(
      { 
        error: '获取用户计划失败',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : 
          undefined
      },
      { status: 500 }
    );
  }
} 
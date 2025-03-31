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
        },
        remaining_clones: true,
        total_clones: true,
        used_clones: true
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

    // 检查订阅状态
    let subscription = user.subscription;
    if (subscription) {
      const now = new Date();
      const endDate = new Date(subscription.endDate);
      
      // 如果订阅已过期，更新状态为expired
      if (endDate < now && subscription.status === 'active') {
        subscription = await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'expired' }
        });

        // 同时清空临时字符配额
        if (user.characterQuota) {
          await prisma.characterQuota.update({
            where: { id: user.characterQuota.id },
            data: {
              temporaryQuota: 0,
              quotaExpiry: null
            }
          });
        }
      }
    }

    // 检查字符配额
    let characterQuota = user.characterQuota;
    if (characterQuota) {
      const now = new Date();
      
      // 如果临时配额已过期或订阅已过期，将其设置为0
      if ((characterQuota.quotaExpiry && new Date(characterQuota.quotaExpiry) < now) ||
          (subscription && new Date(subscription.endDate) < now)) {
        // 计算永久配额的剩余额度
        const remainingPermanentQuota = Math.max(0, characterQuota.permanentQuota - characterQuota.usedCharacters);
        
        // 更新配额信息
        characterQuota = await prisma.characterQuota.update({
          where: { id: characterQuota.id },
          data: { 
            temporaryQuota: 0,
            quotaExpiry: null,
            // 如果已使用的字符数超过永久配额，重置使用量为永久配额
            usedCharacters: characterQuota.usedCharacters > characterQuota.permanentQuota 
              ? characterQuota.permanentQuota 
              : characterQuota.usedCharacters
          }
        });
      }
    }

    // 如果没有找到配额记录，创建一个默认的
    if (!characterQuota) {
      console.log('创建默认配额...');
      characterQuota = await prisma.characterQuota.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          permanentQuota: 0,
          temporaryQuota: 10000, // 保持默认10000字符配额
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
          planType: 'trial', // 保持默认trial类型
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天试用期
          status: 'active',
        },
      });
      console.log('新建订阅信息：', JSON.stringify(subscription, null, 2));
    }

    // 处理返回数据，确保剩余额度不会显示负数
    const totalQuota = characterQuota.permanentQuota + characterQuota.temporaryQuota;
    const remainingQuota = Math.max(0, totalQuota - characterQuota.usedCharacters);

    return NextResponse.json({
      subscription,
      characterQuota: {
        ...characterQuota,
        usedCharacters: Math.min(characterQuota.usedCharacters, totalQuota), // 确保已用额度不超过总额度
      },
      cloneQuota: {
        remaining_clones: user.remaining_clones,
        total_clones: user.total_clones,
        used_clones: user.used_clones
      }
    });

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
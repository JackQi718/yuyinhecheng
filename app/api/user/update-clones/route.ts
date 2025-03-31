import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    // 检查用户是否登录
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { action } = await request.json();

    if (action !== 'decrement') {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }

    // 获取用户信息
    const user = await prisma.users.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        remaining_clones: true,
        used_clones: true
      }
    });

    if (!user || user.remaining_clones <= 0) {
      return NextResponse.json({ error: '克隆次数不足' }, { status: 403 });
    }

    // 更新克隆次数
    const updatedUser = await prisma.users.update({
      where: { id: session.user.id },
      data: {
        remaining_clones: {
          decrement: 1
        },
        used_clones: {
          increment: 1
        }
      },
      select: {
        remaining_clones: true,
        used_clones: true
      }
    });

    return NextResponse.json({
      message: '克隆次数更新成功',
      remaining_clones: updatedUser.remaining_clones,
      used_clones: updatedUser.used_clones
    });

  } catch (error) {
    console.error('更新克隆次数错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新克隆次数失败' },
      { status: 500 }
    );
  }
} 
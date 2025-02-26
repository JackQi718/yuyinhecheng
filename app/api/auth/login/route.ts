import { NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sign } from 'jsonwebtoken';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    // 获取用户
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 400 }
      );
    }

    // 如果是 OAuth 用户（没有密码）
    if (!user.password) {
      return NextResponse.json(
        { error: '请使用社交账号登录' },
        { status: 400 }
      );
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 400 }
      );
    }

    // 生成 JWT token
    const token = sign(
      { 
        id: user.id,
        email: user.email 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      message: '登录成功',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token
    });
  } catch (error) {
    console.error('登录错误:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据验证失败', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
} 
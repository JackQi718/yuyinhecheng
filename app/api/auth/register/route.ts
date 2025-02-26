import { NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { signIn } from 'next-auth/react';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    console.log('开始处理注册请求...');
    const body = await req.json();
    console.log('请求体:', { ...body, password: '***' });
    
    const { email, password, name } = registerSchema.parse(body);
    console.log('数据验证通过');

    // 检查邮箱是否已存在
    console.log('检查邮箱是否存在:', email);
    const existingUser = await getUserByEmail(email);
    console.log('现有用户检查结果:', existingUser);
    
    if (existingUser) {
      console.log('邮箱已被注册');
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    // 密码加密
    console.log('开始密码加密');
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('密码加密完成');

    // 创建用户
    console.log('开始创建用户...');
    const user = await createUser({
      email,
      password: hashedPassword,
      name,
    });
    console.log('用户创建结果:', user);

    if (!user) {
      throw new Error('用户创建失败');
    }

    // 验证用户是否真的创建成功
    const createdUser = await getUserByEmail(email);
    if (!createdUser) {
      throw new Error('用户创建后无法查询到');
    }

    return NextResponse.json(
      { 
        message: '注册成功',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        redirect: '/auth/login?registered=true'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('注册错误:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据验证失败', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
} 
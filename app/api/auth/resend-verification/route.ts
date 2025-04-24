import { NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { createVerificationTokenAndSendEmail } from '@/lib/verification';
import { z } from 'zod';

const resendSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = resendSchema.parse(body);

    // 查找用户
    const user = await getUserByEmail(email);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '该邮箱未注册' },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { success: false, error: '该邮箱已验证' },
        { status: 400 }
      );
    }

    // 创建新的验证令牌并发送验证邮件
    await createVerificationTokenAndSendEmail(user.id, user.email, user.name);

    return NextResponse.json(
      { success: true, message: '验证邮件已发送，请查收' },
      { status: 200 }
    );
  } catch (error) {
    console.error('重发验证邮件失败:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: '无效的邮箱地址' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: '发送验证邮件失败，请稍后重试' },
      { status: 500 }
    );
  }
} 
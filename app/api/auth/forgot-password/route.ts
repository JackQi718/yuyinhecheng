import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createResetTokenAndSendEmail } from '@/lib/password-reset';

// 验证请求格式
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    // 解析请求体
    const body = await req.json();
    console.log('Forgot password request received for email:', body.email);
    
    // 验证请求数据
    const { email } = forgotPasswordSchema.parse(body);
    
    // 创建重置令牌并发送邮件
    const result = await createResetTokenAndSendEmail(email);
    
    if (result.success) {
      return NextResponse.json(
        { message: result.message },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing forgot password request:', error);
    
    // 如果是验证错误
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    // 为安全起见，不透露太多错误信息
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resetPassword } from '@/lib/password-reset';

// 验证请求格式
const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(req: Request) {
  try {
    // 解析请求体
    const body = await req.json();
    console.log('Password reset request received');
    
    // 验证请求数据
    const { token, password } = resetPasswordSchema.parse(body);
    console.log('Token received:', token);
    console.log('Password length:', password.length);
    
    // 验证令牌并重置密码
    console.log('Calling resetPassword function...');
    const result = await resetPassword(token, password);
    console.log('Reset password result:', result);
    
    if (result.success) {
      return NextResponse.json(
        { message: result.message },
        { status: 200 }
      );
    } else {
      console.warn('Password reset failed:', result.message);
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing password reset request:', error);
    
    // 输出详细的错误栈
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      console.error('Error message:', error.message);
    }
    
    // 如果是验证错误
    if (error instanceof z.ZodError) {
      console.warn('Validation error details:', JSON.stringify(error.errors, null, 2));
      return NextResponse.json(
        { error: error.errors[0].message || 'Invalid input data' },
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
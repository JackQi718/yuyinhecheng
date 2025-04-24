import { NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/verification';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: '缺少验证令牌' },
        { status: 400 }
      );
    }

    // 使用数据库验证方式
    const result = await verifyEmailToken(token);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: '邮箱验证成功' },
      { status: 200 }
    );
  } catch (error) {
    console.error('邮箱验证失败:', error);
    return NextResponse.json(
      { success: false, error: '验证过程中出现错误' },
      { status: 500 }
    );
  }
} 
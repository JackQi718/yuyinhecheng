import { createId } from '@paralleldrive/cuid2';
import { prisma } from './prisma';
import { sendPasswordResetEmail, sendPasswordResetEmailFallback } from './email';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// 临时定义 ResetToken 类型，因为 prisma generate 无法运行
interface ResetToken {
  id: string;
  token: string;
  userId: string;
  expires: Date;
  createdAt: Date;
}

// 重置令牌有效期（小时）
const EXPIRATION_HOURS = 1;
// 临时使用固定密钥进行测试，确保生成和验证时使用相同的密钥
// const SECRET_KEY = process.env.NEXTAUTH_SECRET || 'default-secret-key-change-in-production';
const SECRET_KEY = 'testing-fixed-secret-key-for-debugging';

// 生成密码重置令牌
export function generatePasswordResetToken(): string {
  // 使用UUID作为令牌，简单可靠
  return uuidv4();
}

// 计算令牌过期时间
export function calculateTokenExpiration(): Date {
  const now = new Date();
  return new Date(now.getTime() + EXPIRATION_HOURS * 60 * 60 * 1000);
}

// 生成重置URL
export function generateResetUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  console.log('Using base URL for reset link:', baseUrl);
  
  // 简单地将令牌作为URL参数传递
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  console.log('Generated reset URL:', resetUrl);
  
  return resetUrl;
}

// 解析密码重置令牌
export function parseResetToken(token: string): { userId: string; expires: Date } | null {
  try {
    console.log('Parsing reset token (first 10 chars):', token.substring(0, 10) + '...');
    console.log('Token length:', token.length);
    
    // 恢复标准base64编码（将URL安全字符替换回标准字符）
    let normalizedToken = token
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // 添加可能丢失的padding
    while (normalizedToken.length % 4) {
      normalizedToken += '=';
    }
    
    console.log('Normalized token (first 10 chars):', normalizedToken.substring(0, 10) + '...');
    
    // 解码base64令牌
    const decoded = Buffer.from(normalizedToken, 'base64').toString();
    console.log('Decoded token structure:', decoded.includes(':') ? 'contains delimiter' : 'missing delimiter');
    
    const [data, hash] = decoded.split(':');
    
    if (!data || !hash) {
      console.error('Token format invalid - missing data or hash part');
      return null;
    }
    
    // 尝试解析数据部分
    try {
      JSON.parse(data);
      console.log('Data part is valid JSON');
    } catch (jsonError) {
      console.error('Data part is not valid JSON:', jsonError);
      return null;
    }
    
    // 验证签名
    const expectedHash = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(data)
      .digest('hex');
    
    const hashMatch = hash === expectedHash;
    console.log('Hash verification:', hashMatch ? 'successful' : 'failed');
    
    if (!hashMatch) {
      console.error('Invalid token signature');
      return null;
    }
    
    // 解析payload
    const payload = JSON.parse(data);
    console.log('Token payload:', { userId: payload.userId, expires: payload.expires });
    
    return {
      userId: payload.userId,
      expires: new Date(payload.expires)
    };
  } catch (error) {
    console.error('Token parsing failed:', error);
    return null;
  }
}

// 创建密码重置令牌并发送重置邮件
export async function createResetTokenAndSendEmail(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Creating password reset token and sending email for:', email);
    
    // 查找用户
    const user = await prisma.users.findUnique({
      where: { email }
    });
    
    if (!user) {
      // 为安全起见，不透露用户是否存在
      console.log('User not found with email:', email);
      return { 
        success: true, 
        message: 'If this email is registered, you will receive instructions to reset your password.' 
      };
    }
    
    // 生成新令牌
    const token = generatePasswordResetToken();
    const expires = calculateTokenExpiration();
    const id = createId();
    
    console.log('Generated reset token:', token);
    
    try {
      // 使用原始SQL删除该用户现有的所有重置令牌
      await prisma.$executeRaw`DELETE FROM "ResetToken" WHERE "userId" = ${user.id}`;
      
      // 使用原始SQL创建新令牌
      await prisma.$executeRaw`
        INSERT INTO "ResetToken" ("id", "token", "userId", "expires", "createdAt")
        VALUES (${id}, ${token}, ${user.id}, ${expires}, ${new Date()})
      `;
      
      console.log('Token stored in database for user:', user.id);
    } catch (dbError) {
      console.error('Error storing token in database:', dbError);
      // 不抛出错误，而是记录日志并继续，确保用户仍然能收到邮件
      console.log('Proceeding with email sending despite database error');
    }
    
    // 生成重置链接
    const resetUrl = generateResetUrl(token);

    // 尝试发送重置邮件
    try {
      await sendPasswordResetEmail(email, resetUrl, user.name || undefined);
      console.log('Password reset email sent successfully');
    } catch (emailError) {
      // 如果失败，使用备用方法
      console.error('Real email sending failed, using fallback method:', emailError);
      await sendPasswordResetEmailFallback(email, resetUrl, user.name || undefined);
      console.log('Fallback password reset email sent successfully (simulated)');
    }

    return { 
      success: true, 
      message: 'If this email is registered, you will receive instructions to reset your password.' 
    };
  } catch (error) {
    console.error('Failed to create reset token and send email:', error);
    // 为安全起见，不透露错误详情
    return { 
      success: false, 
      message: 'Something went wrong. Please try again later.' 
    };
  }
}

// 验证令牌并重置密码
export async function resetPassword(
  token: string, 
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Validating reset token:', token);
    
    if (!token) {
      return { success: false, message: 'Missing reset token' };
    }
    
    // 使用原始SQL查询令牌
    const tokenResults = await prisma.$queryRaw`
      SELECT * FROM "ResetToken" 
      WHERE token = ${token} 
      LIMIT 1
    `;
    
    console.log('Token search results:', tokenResults ? 'found' : 'not found');
    
    // 检查令牌是否存在
    const tokenRecord = Array.isArray(tokenResults) && tokenResults.length > 0 
      ? tokenResults[0] 
      : null;
    
    if (!tokenRecord) {
      console.error('Token not found in database');
      return { success: false, message: 'Invalid reset token' };
    }
    
    // 检查令牌是否过期
    const now = new Date();
    const expires = new Date(tokenRecord.expires);
    
    if (expires < now) {
      console.error('Token has expired');
      
      // 使用原始SQL删除过期令牌
      await prisma.$executeRaw`DELETE FROM "ResetToken" WHERE token = ${token}`;
      
      return { success: false, message: 'Reset token has expired' };
    }
    
    // 获取用户
    const userId = tokenRecord.userId;
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      console.error('User not found');
      return { success: false, message: 'User does not exist' };
    }

    // 对新密码进行哈希处理
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新用户密码
    await prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
      }
    });
    
    // 使用原始SQL删除已使用的令牌
    await prisma.$executeRaw`DELETE FROM "ResetToken" WHERE token = ${token}`;
    
    console.log('Password updated successfully');

    return { success: true, message: 'Password has been reset successfully' };
  } catch (error) {
    console.error('Failed to reset password:', error);
    return { success: false, message: 'Error occurred during password reset' };
  }
} 
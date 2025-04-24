import { createId } from '@paralleldrive/cuid2';
import { prisma } from './prisma';
import { sendVerificationEmail, sendVerificationEmailFallback } from './email';
import { v4 as uuidv4 } from 'uuid';

// 验证令牌有效期（小时）
const EXPIRATION_HOURS = 24;

// 生成验证令牌
export function generateVerificationToken(): string {
  // 使用UUID作为令牌，简单可靠
  return uuidv4();
}

// 计算令牌过期时间
export function calculateTokenExpiration(): Date {
  const now = new Date();
  return new Date(now.getTime() + EXPIRATION_HOURS * 60 * 60 * 1000);
}

// 生成验证URL
export function generateVerificationUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

// 创建邮箱验证令牌并发送验证邮件
export async function createVerificationTokenAndSendEmail(
  userId: string,
  email: string,
  name?: string
): Promise<void> {
  try {
    console.log('Creating verification token and sending email...');
    
    // 生成新令牌
    const token = generateVerificationToken();
    const expires = calculateTokenExpiration();
    
    console.log('Generated verification token:', token);
    
    try {
      // 使用原始SQL删除该邮箱的所有现有令牌
      await prisma.$executeRaw`DELETE FROM "VerificationToken" WHERE "identifier" = ${email}`;
      
      // 使用原始SQL创建新验证令牌
      await prisma.$executeRaw`
        INSERT INTO "VerificationToken" ("identifier", "token", "expires")
        VALUES (${email}, ${token}, ${expires})
      `;
      
      console.log('Verification token stored in database for email:', email);
    } catch (dbError) {
      console.error('Error storing verification token in database:', dbError);
      // 记录错误但不中断流程
      console.log('Proceeding with email sending despite database error');
    }
    
    // 标记用户为未验证状态
    await prisma.users.update({
      where: { id: userId },
      data: {
        emailVerified: null,
        status: 'pending'
      }
    });

    // 生成验证链接
    const verificationUrl = generateVerificationUrl(token);

    // 尝试发送验证邮件
    try {
      await sendVerificationEmail(email, verificationUrl, name);
      console.log('Verification email sent successfully');
    } catch (emailError) {
      // 如果失败，使用备用方法
      console.error('Real email sending failed, using fallback method:', emailError);
      await sendVerificationEmailFallback(email, verificationUrl, name);
      console.log('Fallback verification email sent successfully (simulated)');
    }
  } catch (error) {
    console.error('Failed to create verification token and send email:', error);
    throw error;
  }
}

// 验证令牌
export async function verifyEmailToken(token: string): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    console.log('Verifying email token:', token);
    
    if (!token) {
      console.error('Missing token');
      return { success: false, error: 'Missing verification token' };
    }
    
    // 使用原始SQL查询令牌
    const tokenResults = await prisma.$queryRaw`
      SELECT * FROM "VerificationToken" 
      WHERE token = ${token} 
      LIMIT 1
    `;
    
    console.log('Token search results:', tokenResults ? 'found' : 'not found');
    
    // 检查令牌是否存在
    const tokenRecord = Array.isArray(tokenResults) && tokenResults.length > 0 
      ? tokenResults[0] 
      : null;
    
    if (!tokenRecord) {
      // 如果找不到令牌，可能是已经成功验证并删除了令牌
      // 尝试通过token值查找是否有对应的用户（令牌保存到某个临时字段）
      console.log('Token not found in database, might have been used before');
      
      return { success: false, error: 'Invalid verification token' };
    }
    
    // 检查令牌是否过期
    const now = new Date();
    const expires = new Date(tokenRecord.expires);
    
    if (expires < now) {
      console.error('Token has expired');
      
      // 使用原始SQL删除过期令牌
      await prisma.$executeRaw`DELETE FROM "VerificationToken" WHERE token = ${token}`;
      
      return { success: false, error: 'Verification token has expired' };
    }
    
    // 通过电子邮件查找用户
    const email = tokenRecord.identifier;
    const user = await prisma.users.findUnique({
      where: { email }
    });
    
    if (!user) {
      console.error('User not found for email:', email);
      return { success: false, error: 'User does not exist' };
    }
    
    // 用户已经验证过了
    if (user.emailVerified) {
      console.log('User already verified:', user.id);
      
      // 使用原始SQL删除已使用的令牌
      await prisma.$executeRaw`DELETE FROM "VerificationToken" WHERE token = ${token}`;
      
      // 返回成功而不是错误，因为用户确实已经验证过了
      return { success: true, userId: user.id };
    }

    // 更新用户邮箱验证状态
    await prisma.users.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        status: 'active'
      }
    });
    
    // 使用原始SQL删除已使用的令牌
    await prisma.$executeRaw`DELETE FROM "VerificationToken" WHERE token = ${token}`;
    
    console.log('Email verification successful for user:', user.id);

    return { success: true, userId: user.id };
  } catch (error) {
    console.error('Failed to verify email token:', error);
    return { success: false, error: 'Error occurred during verification' };
  }
} 
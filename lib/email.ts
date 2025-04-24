import { Resend } from 'resend';
import { VerificationEmailTemplate } from './email-templates/VerificationEmail';
import { ResetPasswordEmailTemplate } from './email-templates/ResetPasswordEmail';
import { renderAsync } from '@react-email/render';
import React from 'react';

// 初始化Resend
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM || 'noreply@voicecanvas.com';

console.log('Resend配置:');
console.log('- API KEY 存在:', !!resendApiKey);
console.log('- 发件人地址:', fromEmail);

if (!resendApiKey) {
  console.error('RESEND_API_KEY 未配置，邮件功能将不可用');
}

const resend = new Resend(resendApiKey);

// 生成简单HTML邮件（英文版本）
function generateSimpleHtml(verificationUrl: string, name?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Verify Your Email Address</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { border: 1px solid #eee; border-radius: 10px; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .button { display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email Address</h1>
        </div>
        <p>Dear ${name || 'User'},</p>
        <p>Thank you for registering with VoiceCanvas. Please click the button below to verify your email address:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" class="button">Verify Email</a>
        </p>
        <p>Or, you can copy and paste the following link into your browser:</p>
        <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <div class="footer">
          <p>If you didn't request this verification, please ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} VoiceCanvas. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 生成简单HTML密码重置邮件
function generateSimpleResetPasswordHtml(resetUrl: string, name?: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Reset Your Password</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { border: 1px solid #eee; border-radius: 10px; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .button { display: inline-block; background-color: #4F46E5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-weight: bold; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <p>Dear ${name || 'User'},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" class="button">Reset Password</a>
        </p>
        <p>Or, you can copy and paste the following link into your browser:</p>
        <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} VoiceCanvas. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// 发送邮箱验证邮件
export async function sendVerificationEmail(email: string, verificationUrl: string, name?: string) {
  try {
    console.log('Preparing to send verification email:');
    console.log('- Recipient:', email);
    console.log('- Verification URL:', verificationUrl);
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    let htmlContent;
    try {
      console.log('Attempting to render React email template...');
      htmlContent = await renderAsync(
        React.createElement(VerificationEmailTemplate, { verificationUrl, userName: name })
      );
      console.log('React email template rendered successfully');
    } catch (renderError) {
      console.error('Failed to render React email template, using simple HTML instead:', renderError);
      htmlContent = generateSimpleHtml(verificationUrl, name);
    }

    console.log('Sending email...');
    console.log('- From:', fromEmail);
    console.log('- To:', email);
    console.log('- HTML length:', htmlContent.length);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Verify Your VoiceCanvas Account',
      html: htmlContent,
    });

    if (error) {
      console.error('Resend API returned an error:', error);
      throw new Error(`Failed to send verification email: ${error.message}`);
    }

    console.log('Verification email sent successfully, ID:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

// 发送密码重置邮件
export async function sendPasswordResetEmail(email: string, resetUrl: string, name?: string) {
  try {
    console.log('Preparing to send password reset email:');
    console.log('- Recipient:', email);
    console.log('- Reset URL:', resetUrl);
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    let htmlContent;
    try {
      console.log('Attempting to render React email template...');
      htmlContent = await renderAsync(
        React.createElement(ResetPasswordEmailTemplate, { resetUrl, userName: name })
      );
      console.log('React email template rendered successfully');
    } catch (renderError) {
      console.error('Failed to render React email template, using simple HTML instead:', renderError);
      htmlContent = generateSimpleResetPasswordHtml(resetUrl, name);
    }

    console.log('Sending email...');
    console.log('- From:', fromEmail);
    console.log('- To:', email);
    console.log('- HTML length:', htmlContent.length);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: 'Reset Your VoiceCanvas Password',
      html: htmlContent,
    });

    if (error) {
      console.error('Resend API returned an error:', error);
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }

    console.log('Password reset email sent successfully, ID:', data?.id);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

// 备用发送邮件的函数（英文版本）
export async function sendVerificationEmailFallback(email: string, verificationUrl: string, name?: string) {
  console.log('[MOCK] Sending verification email - not actually sending');
  console.log('- To:', email);
  console.log('- Verification URL:', verificationUrl);
  console.log('- User name:', name || 'Anonymous');
  
  // 输出验证链接到控制台，以便开发者可以手动测试
  console.log('\n****************************************');
  console.log('Please manually copy the link below to test the verification process:');
  console.log(verificationUrl);
  console.log('****************************************\n');
  
  // 延迟一秒，模拟网络请求
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { 
    success: true, 
    messageId: `mock-${Date.now()}`,
    note: 'Mock email sent'
  };
}

// 备用发送密码重置邮件的函数
export async function sendPasswordResetEmailFallback(email: string, resetUrl: string, name?: string) {
  console.log('[MOCK] Sending password reset email - not actually sending');
  console.log('- To:', email);
  console.log('- Reset URL:', resetUrl);
  console.log('- User name:', name || 'Anonymous');
  
  // 输出重置链接到控制台，以便开发者可以手动测试
  console.log('\n****************************************');
  console.log('Please manually copy the link below to test the password reset process:');
  console.log(resetUrl);
  console.log('****************************************\n');
  
  // 延迟一秒，模拟网络请求
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { 
    success: true, 
    messageId: `mock-${Date.now()}`,
    note: 'Mock password reset email sent'
  };
} 
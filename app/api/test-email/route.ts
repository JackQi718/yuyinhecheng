import { NextResponse } from 'next/server';
import { sendVerificationEmail, sendVerificationEmailFallback } from '@/lib/email';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || 'test@example.com';
    const useFallback = searchParams.get('fallback') === 'true';
    
    // Generate test verification link
    const testVerificationUrl = `http://localhost:3000/verify-email?token=test-token-${Date.now()}`;
    
    console.log('Attempting to send test email to:', email);
    console.log('Verification URL:', testVerificationUrl);
    console.log('Using fallback:', useFallback ? 'Yes' : 'No');
    
    let result;
    
    // Choose between real sending or fallback based on parameter
    if (useFallback) {
      // Use fallback function
      result = await sendVerificationEmailFallback(email, testVerificationUrl, 'Test User');
    } else {
      // Try real sending
      try {
        result = await sendVerificationEmail(email, testVerificationUrl, 'Test User');
      } catch (sendError) {
        console.log('Real email sending failed, switching to fallback');
        result = await sendVerificationEmailFallback(email, testVerificationUrl, 'Test User (fallback)');
      }
    }
    
    console.log('Email sending result:', result);
    
    // Fix for type error - check if result has a note property
    const isFallback = 'note' in result && result.note === 'Mock email sent';
    
    return NextResponse.json({
      success: true,
      message: `Test email ${useFallback ? 'mock ' : ''}sent to ${email}`,
      fallbackUsed: isFallback,
      result
    });
  } catch (error: any) {
    console.error('Test email sending failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send email',
      stack: error.stack
    }, { status: 500 });
  }
} 
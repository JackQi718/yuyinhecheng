import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

const PLAN_PRICES = {
  yearly: process.env.STRIPE_YEARLY_PRICE_ID,
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID,
  tenThousandChars: process.env.STRIPE_10K_PRICE_ID,
  millionChars: process.env.STRIPE_1M_PRICE_ID,
  threeMillionChars: process.env.STRIPE_3M_PRICE_ID,
  clone1: process.env.STRIPE_CLONE_1_PRICE_ID,
  clone10: process.env.STRIPE_CLONE_10_PRICE_ID,
  clone50: process.env.STRIPE_CLONE_50_PRICE_ID,
};

const CLONE_COUNTS = {
  clone1: 1,
  clone10: 10,
  clone50: 50,
};

// 判断是否为订阅类型的计划
const isSubscriptionPlan = (planType: string) => {
  return planType === 'yearly' || planType === 'monthly';
};

export async function POST(req: Request) {
  try {
    // 验证环境变量
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe secret key is not configured' },
        { status: 500 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { planType } = await req.json();
    const priceId = PLAN_PRICES[planType as keyof typeof PLAN_PRICES];

    // 验证价格ID
    if (!priceId) {
      return NextResponse.json(
        { error: `Price ID not found for plan type: ${planType}` },
        { status: 400 }
      );
    }

    // 检查是否是克隆包
    const isClonePackage = planType.startsWith('clone');
    const cloneCount = isClonePackage ? CLONE_COUNTS[planType as keyof typeof CLONE_COUNTS] : 0;

    // 验证基础URL
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      return NextResponse.json(
        { error: 'Base URL is not configured' },
        { status: 500 }
      );
    }

    const mode = isSubscriptionPlan(planType) ? 'subscription' : 'payment';

    const checkoutSession = await stripe.checkout.sessions.create({
      ...(mode === 'payment' ? { submit_type: 'pay' } : {}),
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile?success=true&type=${isClonePackage ? 'clone' : 'quota'}&count=${cloneCount}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
      metadata: {
        userId: session.user.id,
        planType,
        cloneCount: cloneCount.toString(),
      },
    } as Stripe.Checkout.SessionCreateParams);

    return NextResponse.json({ sessionId: checkoutSession.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: `Error creating checkout session: ${errorMessage}` },
      { status: 500 }
    );
  }
} 
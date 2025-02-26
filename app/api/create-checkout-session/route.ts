import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

const PLAN_PRICES = {
  yearly: process.env.STRIPE_YEARLY_PRICE_ID,
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID,
  tenThousandChars: process.env.STRIPE_10K_PRICE_ID,
  millionChars: process.env.STRIPE_1M_PRICE_ID,
  threeMillionChars: process.env.STRIPE_3M_PRICE_ID,
};

export async function POST(req: Request) {
  try {
    const { planType } = await req.json();
    const priceId = PLAN_PRICES[planType as keyof typeof PLAN_PRICES];

    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: planType === 'yearly' || planType === 'monthly' ? 'subscription' : 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile?success=true&type=${planType === 'yearly' || planType === 'monthly' ? 'subscription' : 'quota'}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?canceled=true`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
} 
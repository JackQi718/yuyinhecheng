import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    console.log('接收到 Stripe webhook 请求');
    const body = await req.text();
    const sig = headers().get('stripe-signature');

    let event: Stripe.Event;

    if (process.env.NODE_ENV === 'production') {
      // 生产环境进行签名验证
      if (!sig || !endpointSecret) {
        console.log('缺少签名或端点密钥');
        return NextResponse.json(
          { error: 'Missing signature or endpoint secret' },
          { status: 400 }
        );
      }

      try {
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
      } catch (err) {
        console.error('Webhook 签名验证失败:', err);
        return NextResponse.json(
          { error: 'Webhook signature verification failed' },
          { status: 400 }
        );
      }
    } else {
      // 开发环境直接解析 JSON
      event = JSON.parse(body) as Stripe.Event;
    }

    console.log('Webhook 事件类型:', event.type);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          console.log('处理 checkout.session.completed 事件');
          const session = event.data.object as Stripe.Checkout.Session;
          console.log('会话信息:', JSON.stringify(session, null, 2));
          
          // 从会话中直接获取客户邮箱
          const email = session.customer_details?.email;
          if (!email) {
            throw new Error('未找到客户邮箱');
          }

          console.log('查找用户:', email);
          const user = await prisma.users.findUnique({
            where: { email },
            include: {
              subscription: true,
              characterQuota: true,
            },
          });

          if (!user) {
            throw new Error('未找到用户');
          }
          console.log('找到用户:', user.id);

          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          console.log('订单项目:', JSON.stringify(lineItems, null, 2));
          
          const priceId = lineItems.data[0]?.price?.id;
          if (!priceId) {
            throw new Error('未找到价格 ID');
          }
          console.log('价格 ID:', priceId);

          // 根据价格 ID 确定计划类型和字符额度
          const planDetails = getPlanDetailsFromPriceId(priceId);
          console.log('计划详情:', planDetails);

          if (planDetails.type === 'subscription') {
            if (!planDetails.planType || !planDetails.endDate) {
              throw new Error('订阅计划类型或结束日期未定义');
            }
            console.log('更新订阅信息');

            // 获取现有订阅信息
            const existingSubscription = user.subscription;
            let newEndDate = planDetails.endDate;
            // 保持更高级的计划类型（年度优先于月度）
            let newPlanType = planDetails.planType;
            if (existingSubscription?.status === 'active' && existingSubscription.planType === 'yearly' && planDetails.planType === 'monthly') {
              newPlanType = 'yearly'; // 如果已有年度计划，保持年度计划
              console.log('保持年度计划类型');
            }

            // 如果已有活跃订阅，累加时间
            if (existingSubscription && existingSubscription.status === 'active') {
              const currentEndDate = new Date(existingSubscription.endDate);
              if (currentEndDate > new Date()) {
                // 计算剩余天数
                const remainingDays = Math.ceil((currentEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                console.log('现有订阅剩余天数:', remainingDays);

                // 新订阅的天数
                const addDays = planDetails.planType === 'yearly' ? 365 : 30;
                console.log('新订阅天数:', addDays);

                // 累加天数
                newEndDate = new Date();
                newEndDate.setDate(newEndDate.getDate() + remainingDays + addDays);
                console.log('累加订阅时间至:', newEndDate);
              }
            }

            await prisma.subscription.upsert({
              where: { userId: user.id },
              update: {
                planType: newPlanType, // 使用可能更新后的计划类型
                endDate: newEndDate,
                status: 'active',
              },
              create: {
                userId: user.id,
                planType: newPlanType, // 使用可能更新后的计划类型
                startDate: new Date(),
                endDate: newEndDate,
                status: 'active',
              },
            });

            console.log('更新字符额度');
            const existingQuota = user.characterQuota;
            const currentTemporaryQuota = existingQuota?.temporaryQuota || 0;
            
            console.log('当前临时额度:', currentTemporaryQuota);
            console.log('新增额度:', planDetails.characters);
            
            // 如果已有临时额度且未过期
            if (existingQuota?.quotaExpiry && new Date(existingQuota.quotaExpiry) > new Date()) {
              // 使用新的到期时间
              console.log('累加临时额度，到期时间:', newEndDate);
              await prisma.characterQuota.update({
                where: { userId: user.id },
                data: {
                  temporaryQuota: {
                    increment: planDetails.characters
                  },
                  quotaExpiry: newEndDate,
                  lastUpdated: new Date(),
                }
              });
            } else {
              // 如果没有临时额度或已过期，设置新的临时额度和到期时间
              console.log('设置新的临时额度，到期时间:', newEndDate);
              await prisma.characterQuota.upsert({
                where: { userId: user.id },
                update: {
                  temporaryQuota: planDetails.characters,
                  quotaExpiry: newEndDate,
                  lastUpdated: new Date(),
                },
                create: {
                  userId: user.id,
                  temporaryQuota: planDetails.characters,
                  permanentQuota: 0,
                  quotaExpiry: newEndDate,
                  usedCharacters: 0,
                  lastUpdated: new Date(),
                }
              });
            }
          } else {
            // 永久额度的处理
            await prisma.characterQuota.upsert({
              where: { userId: user.id },
              update: {
                permanentQuota: {
                  increment: planDetails.characters
                },
                lastUpdated: new Date(),
              },
              create: {
                userId: user.id,
                permanentQuota: planDetails.characters,
                temporaryQuota: 0,
                usedCharacters: 0,
                lastUpdated: new Date(),
              }
            });
          }

          console.log('处理完成');
          break;
        }

        case 'customer.subscription.updated': {
          console.log('处理 customer.subscription.updated 事件');
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const email = customer.email;

          if (!email) {
            throw new Error('未找到客户邮箱');
          }

          const user = await prisma.users.findUnique({
            where: { email },
            include: { subscription: true },
          });

          if (!user) {
            throw new Error('未找到用户');
          }

          // 更新订阅状态
          await prisma.subscription.update({
            where: { userId: user.id },
            data: {
              status: subscription.status || 'active',
              endDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : new Date(),
            },
          });
          break;
        }

        case 'customer.subscription.deleted': {
          console.log('处理 customer.subscription.deleted 事件');
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const email = customer.email;

          if (!email) {
            throw new Error('未找到客户邮箱');
          }

          const user = await prisma.users.findUnique({
            where: { email },
            include: { subscription: true },
          });

          if (!user) {
            throw new Error('未找到用户');
          }

          // 更新订阅状态为已取消
          await prisma.subscription.update({
            where: { userId: user.id },
            data: {
              status: 'canceled',
            },
          });
          break;
        }

        case 'invoice.payment_succeeded': {
          console.log('处理 invoice.payment_succeeded 事件');
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const email = customer.email;

          if (!email) {
            throw new Error('未找到客户邮箱');
          }

          const user = await prisma.users.findUnique({
            where: { email },
            include: { subscription: true, characterQuota: true },
          });

          if (!user) {
            throw new Error('未找到用户');
          }

          // 如果是订阅续费，更新字符配额
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
            const priceId = subscription.items.data[0]?.price.id;
            if (priceId) {
              const planDetails = getPlanDetailsFromPriceId(priceId);
              
              if (!planDetails.planType || !planDetails.endDate) {
                throw new Error('订阅计划类型或结束日期未定义');
              }

              // 获取现有订阅信息
              const existingSubscription = user.subscription;
              let newEndDate = planDetails.endDate;
              // 保持更高级的计划类型（年度优先于月度）
              let newPlanType = planDetails.planType;
              if (existingSubscription?.status === 'active' && existingSubscription.planType === 'yearly' && planDetails.planType === 'monthly') {
                newPlanType = 'yearly'; // 如果已有年度计划，保持年度计划
                console.log('保持年度计划类型');
              }

              // 如果已有活跃订阅，累加时间
              if (existingSubscription && existingSubscription.status === 'active') {
                const currentEndDate = new Date(existingSubscription.endDate);
                if (currentEndDate > new Date()) {
                  // 计算剩余天数
                  const remainingDays = Math.ceil((currentEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  console.log('现有订阅剩余天数:', remainingDays);

                  // 新订阅的天数
                  const addDays = planDetails.planType === 'yearly' ? 365 : 30;
                  console.log('新订阅天数:', addDays);

                  // 累加天数
                  newEndDate = new Date();
                  newEndDate.setDate(newEndDate.getDate() + remainingDays + addDays);
                  console.log('累加订阅时间至:', newEndDate);
                }
              }

              // 更新订阅信息
              await prisma.subscription.upsert({
                where: { userId: user.id },
                update: {
                  planType: newPlanType, // 使用可能更新后的计划类型
                  endDate: newEndDate,
                  status: 'active',
                },
                create: {
                  userId: user.id,
                  planType: newPlanType, // 使用可能更新后的计划类型
                  startDate: new Date(),
                  endDate: newEndDate,
                  status: 'active',
                },
              });

              // 更新字符额度
              const existingQuota = user.characterQuota;
              
              if (existingQuota?.quotaExpiry && new Date(existingQuota.quotaExpiry) > new Date()) {
                // 如果已有未过期的临时额度，累加额度并更新到期时间
                console.log('累加临时额度，到期时间:', newEndDate);
                await prisma.characterQuota.update({
                  where: { userId: user.id },
                  data: {
                    temporaryQuota: {
                      increment: planDetails.characters
                    },
                    quotaExpiry: newEndDate,
                    lastUpdated: new Date(),
                  }
                });
              } else {
                // 如果没有临时额度或已过期，设置新的临时额度和到期时间
                console.log('设置新的临时额度，到期时间:', newEndDate);
                await prisma.characterQuota.upsert({
                  where: { userId: user.id },
                  update: {
                    temporaryQuota: planDetails.characters,
                    quotaExpiry: newEndDate,
                    lastUpdated: new Date(),
                  },
                  create: {
                    userId: user.id,
                    temporaryQuota: planDetails.characters,
                    permanentQuota: 0,
                    quotaExpiry: newEndDate,
                    usedCharacters: 0,
                    lastUpdated: new Date(),
                  }
                });
              }
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          console.log('处理 invoice.payment_failed 事件');
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const email = customer.email;

          if (!email) {
            throw new Error('未找到客户邮箱');
          }

          const user = await prisma.users.findUnique({
            where: { email },
            include: { subscription: true },
          });

          if (!user) {
            throw new Error('未找到用户');
          }

          // 更新订阅状态为支付失败
          await prisma.subscription.update({
            where: { userId: user.id },
            data: {
              status: 'payment_failed',
            },
          });
          break;
        }
      }

      return NextResponse.json({ received: true });
    } catch (error) {
      console.error('处理 webhook 时出错:', error);
      return NextResponse.json(
        { error: 'Webhook processing failed', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Webhook 处理主流程错误:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

function getPlanDetailsFromPriceId(priceId: string): {
  type: 'subscription' | 'oneTime';
  planType?: string;
  endDate?: Date;
  characters: number;
} {
  const now = new Date();
  const oneYear = new Date(now.setFullYear(now.getFullYear() + 1));
  const oneMonth = new Date(now.setMonth(now.getMonth() + 1));

  switch (priceId) {
    case process.env.STRIPE_YEARLY_PRICE_ID:
      return {
        type: 'subscription',
        planType: 'yearly',
        endDate: oneYear,
        characters: 1500000,
      };
    case process.env.STRIPE_MONTHLY_PRICE_ID:
      return {
        type: 'subscription',
        planType: 'monthly',
        endDate: oneMonth,
        characters: 100000,
      };
    case process.env.STRIPE_10K_PRICE_ID:
      return {
        type: 'oneTime',
        characters: 10000,
      };
    case process.env.STRIPE_1M_PRICE_ID:
      return {
        type: 'oneTime',
        characters: 1000000,
      };
    case process.env.STRIPE_3M_PRICE_ID:
      return {
        type: 'oneTime',
        characters: 3000000,
      };
    default:
      throw new Error('无效的价格 ID');
  }
} 
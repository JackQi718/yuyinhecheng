'use client';

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";
import { NavBar } from "@/components/nav-bar";
import { useRouter } from "next/navigation";
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const plans = [
  {
    type: "trial",
    features: [
      "freeChars|amount=10000",
      "trialPeriod|days=7",
      "languageSupport",
      "basicSpeedControl",
      "basicVoiceSelection",
      "textInputOnly",
      "standardSupport"
    ]
  },
  {
    type: "yearly",
    features: [
      "yearlyQuota|amount=1500000",
      "languageSupport",
      "fullSpeedControl",
      "allVoices",
      "wordByWordReading",
      "fileUpload",
      "audioVisualization",
      "advancedAudioEdit",
      "support247",
      "earlyAccess"
    ]
  },
  {
    type: "monthly",
    features: [
      "monthlyQuota|amount=100000",
      "languageSupport",
      "fullSpeedControl",
      "allVoices",
      "wordByWordReading",
      "fileUpload",
      "audioVisualization",
      "prioritySupport"
    ]
  }
];

const payAsYouGo = [
  {
    type: "tenThousandChars",
    price: "$6",
    popular: false
  },
  {
    type: "millionChars",
    price: "$55",
    popular: true
  },
  {
    type: "threeMillionChars",
    price: "$150",
    popular: false
  }
];

export default function PricingPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const handlePlanClick = async (type: string) => {
    if (type === 'trial') {
      router.push('/app');
      return;
    }

    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: type,
        }),
      });

      const { sessionId } = await response.json();
      const result = await stripe.redirectToCheckout({
        sessionId,
      });

      if (result.error) {
        console.error(result.error);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getPlanName = (type: string) => {
    switch (type) {
      case 'trial': return t('trialPlan');
      case 'yearly': return t('yearlyPlan');
      case 'monthly': return t('monthlyPlan');
      default: return '';
    }
  };

  const getPlanDesc = (type: string) => {
    switch (type) {
      case 'trial': return t('trialDesc');
      case 'yearly': return t('yearlyDesc');
      case 'monthly': return t('monthlyDesc');
      default: return '';
    }
  };

  const getPlanPrice = (type: string) => {
    switch (type) {
      case 'trial': return t('free');
      case 'yearly': return '$49.9';
      case 'monthly': return '$4.99';
      default: return '';
    }
  };

  const getPlanPeriod = (type: string) => {
    switch (type) {
      case 'yearly': return t('perYear');
      case 'monthly': return t('perMonth');
      default: return '';
    }
  };

  const getButtonText = (type: string) => {
    switch (type) {
      case 'trial': return t('startTrial');
      case 'yearly': return t('chooseYearly');
      case 'monthly': return t('chooseMonthly');
      default: return '';
    }
  };

  const translateFeature = (feature: string) => {
    const [key, params] = feature.split('|');
    if (params) {
      const paramObj = Object.fromEntries(
        params.split(',').map(p => {
          const [k, v] = p.split('=');
          if (k === 'amount') {
            return [k, v];
          }
          return [k, v];
        })
      );
      return t(key, paramObj as any);
    }
    return t(key);
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient-x">{t('pricingTitle')}</h1>
          <p className="text-xl text-muted-foreground">{t('pricingSubtitle')}</p>
        </div>

        {/* 会员方案 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <Card key={plan.type} className={`p-6 relative ${plan.type === 'yearly' ? 'border-primary shadow-lg' : ''}`}>
              {plan.type === 'yearly' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm">
                    {t('mostPopular')}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-lg" />
              <div className="relative">
                <div className="mb-4">
                  <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">{getPlanName(plan.type)}</h3>
                  <p className="text-muted-foreground">{getPlanDesc(plan.type)}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">{getPlanPrice(plan.type)}</span>
                  <span className="text-muted-foreground">{getPlanPeriod(plan.type)}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <Check className="h-5 w-5 text-primary mr-2" />
                      <span>{translateFeature(feature)}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white" 
                  variant={plan.type === 'yearly' ? "default" : "outline"}
                  onClick={() => handlePlanClick(plan.type)}
                >
                  {getButtonText(plan.type)}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* 按量付费方案 */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">{t('payAsYouGo')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {payAsYouGo.map((plan) => (
              <Card key={plan.type} className={`p-6 relative ${plan.popular ? 'border-primary shadow-lg' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm">
                      {t('bestValue')}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-lg" />
                <div className="relative text-center">
                  <h3 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">{t(plan.type)}</h3>
                  <div className="mb-6">
                    <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">{plan.price}</span>
                  </div>
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white" 
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handlePlanClick(plan.type)}
                  >
                    {t('buyNow')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ部分 */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">{t('faq')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-2">{t('faqTrialFeatures')}</h3>
              <p className="text-muted-foreground">{t('faqTrialFeaturesAnswer')}</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">{t('faqHowToTry')}</h3>
              <p className="text-muted-foreground">{t('faqHowToTryAnswer')}</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">{t('faqQuotaCalc')}</h3>
              <p className="text-muted-foreground">{t('faqQuotaCalcAnswer')}</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">{t('faqPayment')}</h3>
              <p className="text-muted-foreground">{t('faqPaymentAnswer')}</p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">{t('faqQuotaType')}</h3>
              <p className="text-muted-foreground">{t('faqQuotaTypeAnswer')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 
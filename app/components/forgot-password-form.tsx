'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useLanguage } from '@/lib/i18n/language-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: t('error'),
        description: t('emailRequired') || 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setIsSuccess(true);
        toast({
          title: t('success') || 'Success',
          description: data.message,
        });
      } else {
        toast({
          title: t('error'),
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending password reset request:', error);
      toast({
        title: t('error'),
        description: t('somethingWentWrong') || 'Something went wrong. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            {t('forgotPassword') || 'Forgot Password'}
          </CardTitle>
          <CardDescription>
            {isSuccess 
              ? (t('resetLinkSent') || 'Reset link sent! Check your email.') 
              : (t('enterEmailForReset') || 'Enter your email to receive a password reset link')}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {!isSuccess ? (
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('sendResetLink') || 'Send Reset Link'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4">
              <p className="mb-4">{t('checkEmailForInstructions') || 'Check your email for instructions to reset your password.'}</p>
              <p className="text-sm text-muted-foreground">{t('emailMightTakeTime') || 'The email might take a few minutes to arrive. Don\'t forget to check your spam folder.'}</p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button 
            asChild 
            variant="outline"
            className="border-primary/20 hover:bg-primary/5"
          >
            <Link href="/" className="flex items-center">
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t('goToHomepage') || 'Go to Homepage'}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 
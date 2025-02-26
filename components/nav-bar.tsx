'use client';

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Sun, Moon, ArrowLeft, User, CreditCard } from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/lib/i18n/language-context";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { AuthDialog } from "@/components/auth-dialog";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton } from "@/components/sign-out-button";

export function NavBar() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const pathname = usePathname();
  const showBackButton = pathname !== '/';
  const [mounted, setMounted] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="border-b">
        <div className="container mx-auto px-4 h-16" />
      </div>
    );
  }

  return (
    <div className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4 md:gap-8">
            {showBackButton && (
              <Link href="/" className="hidden md:flex items-center text-sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('back')}
              </Link>
            )}
            
            <Link
              href="/" 
              className="flex items-center gap-2 group relative px-2 md:px-3 py-1"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
              <Image
                src="/images/logo.png"
                alt="Logo"
                width={32}
                height={32}
                className="w-6 h-6 md:w-8 md:h-8 transition-transform duration-300 group-hover:scale-110"
              />
              <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-gradient-x hidden md:inline-block">
                VoiceCanvas
              </span>
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-all duration-300 -z-10" />
            </Link>
          </div>

          <div className="hidden md:flex items-center justify-center flex-1 gap-8">
            <Link
              href="/"
              className="text-base font-bold relative group"
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                {t('home')}
              </span>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 group-hover:w-full"></div>
            </Link>
            <Link
              href="/app"
              className="text-base font-bold relative group"
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                {t('workspace')}
              </span>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 group-hover:w-full"></div>
            </Link>
            <Link
              href="/pricing"
              className="text-base font-bold relative group"
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                {t('subscription')}
              </span>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 group-hover:w-full"></div>
            </Link>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[90px] md:w-[120px] h-8 md:h-10 text-xs md:text-sm border-primary/10 bg-background/60 backdrop-blur focus:ring-0 focus:ring-offset-0 shadow-none">
                <Globe className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent 
                className="w-[90px] md:w-[120px] bg-background/95 border-primary/10"
                align="end"
                side="bottom"
                avoidCollisions={false}
              >
                <div className="max-h-[40vh] overflow-y-auto">
                  <SelectItem value="en" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('english')}</SelectItem>
                  <SelectItem value="zh" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('chinese')}</SelectItem>
                  <SelectItem value="ja" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('japanese')}</SelectItem>
                  <SelectItem value="ko" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('korean')}</SelectItem>
                  <SelectItem value="yue" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('cantonese')}</SelectItem>
                  <SelectItem value="es" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('spanish')}</SelectItem>
                  <SelectItem value="fr" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('french')}</SelectItem>
                  <SelectItem value="de" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('german')}</SelectItem>
                  <SelectItem value="it" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('italian')}</SelectItem>
                  <SelectItem value="pt" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('portuguese')}</SelectItem>
                  <SelectItem value="ru" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('russian')}</SelectItem>
                  <SelectItem value="nl" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('dutch')}</SelectItem>
                  <SelectItem value="sv" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('swedish')}</SelectItem>
                  <SelectItem value="no" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('norwegian')}</SelectItem>
                  <SelectItem value="da" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('danish')}</SelectItem>
                  <SelectItem value="fi" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('finnish')}</SelectItem>
                  <SelectItem value="el" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('greek')}</SelectItem>
                  <SelectItem value="pl" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('polish')}</SelectItem>
                  <SelectItem value="ro" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('romanian')}</SelectItem>
                  <SelectItem value="hu" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('hungarian')}</SelectItem>
                  <SelectItem value="tr" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('turkish')}</SelectItem>
                  <SelectItem value="cy" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('welsh')}</SelectItem>
                  <SelectItem value="ar" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('arabic')}</SelectItem>
                  <SelectItem value="he" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('hebrew')}</SelectItem>
                  <SelectItem value="hi" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('hindi')}</SelectItem>
                  <SelectItem value="id" className="py-1.5 md:py-2 px-2 md:px-3 text-xs md:text-sm focus:bg-primary/5 cursor-pointer">{t('indonesian')}</SelectItem>
                </div>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:h-10 md:w-10"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon className="h-4 w-4 md:h-5 md:w-5" /> : <Sun className="h-4 w-4 md:h-5 md:w-5" />}
            </Button>

            <div className="h-6 w-[1px] bg-border hidden md:block" />

            {session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="h-8 md:h-10 px-1 md:px-2 flex items-center gap-2 group relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    <Avatar className="h-6 w-6 md:h-8 md:w-8 ring-2 ring-offset-2 ring-offset-background ring-primary/10 group-hover:ring-primary/30 transition-all duration-300">
                      <AvatarImage src={session.user.image || ""} />
                      <AvatarFallback>
                        <User className="h-3 w-3 md:h-4 md:w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline-block text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 group-hover:opacity-80 transition-opacity duration-300">
                      {session.user.name || session.user.email}
                    </span>
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-all duration-300 -z-10" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-[200px] p-2 bg-background/95 backdrop-blur-sm border-primary/10"
                >
                  <DropdownMenuItem asChild>
                    <Link 
                      href="/profile" 
                      className="flex items-center px-3 py-2 rounded-md cursor-pointer hover:bg-primary/5 transition-colors duration-200"
                    >
                      <User className="mr-2 h-4 w-4 text-primary/60" />
                      <span className="font-medium">{t('profile')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link 
                      href="/pricing" 
                      className="flex items-center px-3 py-2 rounded-md cursor-pointer hover:bg-primary/5 transition-colors duration-200"
                    >
                      <CreditCard className="mr-2 h-4 w-4 text-primary/60" />
                      <span className="font-medium">{t('subscription')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <div className="h-[1px] bg-border/50 my-2" />
                  <DropdownMenuItem className="px-3 py-2 rounded-md cursor-pointer hover:bg-destructive/5 transition-colors duration-200 text-destructive hover:text-destructive">
                    <SignOutButton />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAuthDialog(true)}
                  className="text-xs md:text-sm px-2 md:px-4 h-8 md:h-10"
                >
                  {t('login')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowAuthDialog(true);
                    const event = new CustomEvent('switch-to-register');
                    document.dispatchEvent(event);
                  }}
                  className="text-xs md:text-sm px-2 md:px-4 h-8 md:h-10 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300"
                >
                  {t('register')}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      <AuthDialog isOpen={showAuthDialog} onClose={() => setShowAuthDialog(false)} />
    </div>
  );
} 
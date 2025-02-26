"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import type { Language, TranslationKey, TranslationType } from './translations/types'
import { en } from './translations/en'
import { zh } from './translations/zh'
import { ja } from './translations/ja'
import { ko } from './translations/ko'
import { yue } from './translations/yue'
import { es } from './translations/es'
import { fr } from './translations/fr'
import { de } from './translations/de'
import { it } from './translations/it'
import { pt } from './translations/pt'
import { ru } from './translations/ru'
import { nl } from './translations/nl'
import { sv } from './translations/sv'
import { no } from './translations/no'
import { da } from './translations/da'
import { fi } from './translations/fi'
import { el } from './translations/el'
import { pl } from './translations/pl'
import { ro } from './translations/ro'
import { hu } from './translations/hu'
import { tr } from './translations/tr'
import { cy } from './translations/cy'
import { ar } from './translations/ar'
import { he } from './translations/he'
import { hi } from './translations/hi'
import { id } from './translations/id'

const translations = {
  en, zh, ja, ko, yue, es, fr, de, it, pt, ru, nl, sv, no, da,
  fi, el, pl, ro, hu, tr, cy, ar, he, hi, id
} as const;

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  // 初始化时从本地存储读取语言设置
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language');
    if (savedLanguage) {
      setLanguage(savedLanguage as Language);
    }
  }, []);

  // 当语言改变时，保存到本地存储
  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('preferred-language', lang);
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    const translation = translations[language][key];
    if (typeof translation === 'function') {
      return translation(params || {});
    }
    if (params) {
      return Object.entries(params).reduce(
        (str, [key, value]) => str.replace(`{${key}}`, String(value)),
        translation as string
      );
    }
    return translation as string;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
} 
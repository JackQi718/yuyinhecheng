import { en } from './en';

export type Language = 
  | 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'ru' | 'it' | 'pt' | 'de' 
  | 'id' | 'ar' | 'yue' | 'da' | 'nl' | 'fi' | 'el' | 'he' | 'hi' | 'hu'
  | 'no' | 'pl' | 'ro' | 'sv' | 'tr' | 'cy';

export type TranslationType = {
  [key: string]: string | ((params: Record<string, string | number>) => string);
};

export type TranslationKey = keyof typeof en; 
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Volume2, Upload, Languages, Sun, Moon, Globe, Download, Pause, Play } from "lucide-react";
import { useTheme } from "next-themes";
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from "@/lib/i18n/language-context";
import { synthesizeSpeech, playPollyAudio, hasSingleVoice, downloadAudio, SpeechService, minimaxLanguages, playMinimaxAudio } from "@/lib/polly-service";
import { useSpeech } from '@/hooks/use-speech';
import { AudioVisualizer } from "@/components/audio-visualizer";
import { NavBar } from "@/components/nav-bar";
import { motion } from "framer-motion";
import { RequireAuth } from "@/components/require-auth";
import { useSession } from "next-auth/react";
import { useAnalytics } from '@/hooks/use-analytics';

interface Language {
  code: string;
  nameKey: 'chinese' | 'english' | 'japanese' | 'korean' | 'spanish' | 'french' | 'russian' | 'italian' | 'portuguese' | 'german' | 'indonesian' | 'arabic' | 'cantonese' | 'danish' | 'dutch' | 'finnish' | 'greek' | 'hebrew' | 'hindi' | 'hungarian' | 'norwegian' | 'polish' | 'romanian' | 'swedish' | 'turkish' | 'welsh';
}

const MINIMAX_LANGUAGES = [
  { code: 'zh-CN', nameKey: 'chinese' as const },
  { code: 'en-US', nameKey: 'english' as const },
  { code: 'ja-JP', nameKey: 'japanese' as const },
  { code: 'ko-KR', nameKey: 'korean' as const },
  { code: 'es-ES', nameKey: 'spanish' as const },
  { code: 'fr-FR', nameKey: 'french' as const },
  { code: 'ru-RU', nameKey: 'russian' as const },
  { code: 'it-IT', nameKey: 'italian' as const },
  { code: 'pt-PT', nameKey: 'portuguese' as const },
  { code: 'de-DE', nameKey: 'german' as const }
] as const satisfies readonly Language[];

const AWS_LANGUAGES: readonly Language[] = [
  { code: 'zh-CN', nameKey: 'chinese' as const },
  { code: 'en-US', nameKey: 'english' as const },
  { code: 'ja-JP', nameKey: 'japanese' as const },
  { code: 'ko-KR', nameKey: 'korean' as const },
  { code: 'es-ES', nameKey: 'spanish' as const },
  { code: 'fr-FR', nameKey: 'french' as const },
  { code: 'ru-RU', nameKey: 'russian' as const },
  { code: 'it-IT', nameKey: 'italian' as const },
  { code: 'pt-PT', nameKey: 'portuguese' as const },
  { code: 'de-DE', nameKey: 'german' as const },
  { code: 'id-ID', nameKey: 'indonesian' as const },
  { code: 'arb', nameKey: 'arabic' as const },
  { code: 'yue-CN', nameKey: 'cantonese' as const },
  { code: 'da-DK', nameKey: 'danish' as const },
  { code: 'nl-NL', nameKey: 'dutch' as const },
  { code: 'fi-FI', nameKey: 'finnish' as const },
  { code: 'el-GR', nameKey: 'greek' as const },
  { code: 'he-IL', nameKey: 'hebrew' as const },
  { code: 'hi-IN', nameKey: 'hindi' as const },
  { code: 'hu-HU', nameKey: 'hungarian' as const },
  { code: 'nb-NO', nameKey: 'norwegian' as const },
  { code: 'pl-PL', nameKey: 'polish' as const },
  { code: 'ro-RO', nameKey: 'romanian' as const },
  { code: 'sv-SE', nameKey: 'swedish' as const },
  { code: 'tr-TR', nameKey: 'turkish' as const },
  { code: 'cy-GB', nameKey: 'welsh' as const }
] as const;

const SERVICE_LIMITS = {
  aws: 100000,    // AWS Polly 最大支持 100,000 字符
  minimax: 10000  // Minimax 最大支持 10,000 字符
};

export default function Home() {
  const { t, language, setLanguage } = useLanguage();
  const [text, setText] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [speed, setSpeed] = useState(1);
  const [isFemaleVoice, setIsFemaleVoice] = useState(true);
  const [isWordByWord, setIsWordByWord] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const [lastGeneratedAudio, setLastGeneratedAudio] = useState<ArrayBuffer | null>(null);
  const { speak, isLoading, error, SUPPORTED_LANGUAGES } = useSpeech();
  const [speechService, setSpeechService] = useState<SpeechService>('aws');
  const [audioVisualizer, setAudioVisualizer] = useState<{
    audioContext: AudioContext;
    source: AudioBufferSourceNode;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { data: session } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const analytics = useAnalytics();

  useEffect(() => {
    setMounted(true);
    
    // Initialize voices
    const initVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    initVoices();
    window.speechSynthesis.onvoiceschanged = initVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  useEffect(() => {
    if (hasSingleVoice(selectedLanguage, speechService)) {
      setIsFemaleVoice(true);
    }
  }, [selectedLanguage, speechService]);

  // 当切换到Minimax时，自动选择中文
  useEffect(() => {
    if (speechService === 'minimax') {
      setSelectedLanguage('zh-CN');
    }
  }, [speechService]);

  // 处理文本输入，限制字符数
  const handleTextChange = (value: string) => {
    const limit = SERVICE_LIMITS[speechService];
    if (value.length <= limit) {
      setText(value);
    } else {
      toast({
        title: t("error"),
        description: t("当前服务商最大支持 {limit} 字符", { limit: limit.toLocaleString() }),
        variant: "destructive",
      });
    }
  };

  // 当切换服务商时，如果当前文本超过新服务商的限制，则截断文本
  useEffect(() => {
    const limit = SERVICE_LIMITS[speechService];
    if (text.length > limit) {
      setText(text.slice(0, limit));
      toast({
        description: t("文本已超过当前服务商的字符限制，已自动截断"),
        variant: "default",
      });
    }
  }, [speechService]);

  const handleSpeak = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      if (!text) {
        toast({
          title: t("noTextError"),
          description: t("pleaseEnterText"),
          variant: "destructive",
        });
        return;
      }

      let quotaCheckPassed = false;

      try {
        // 检查用户是否登录
        if (!session?.user) {
          toast({
            title: t("loginRequired"),
            description: t("loginToUseFeature"),
            variant: "destructive",
          });
          return;
        }

        // 获取用户当前配额信息
        const quotaResponse = await fetch('/api/user/plan');
        if (quotaResponse.ok) {
          const quotaData = await quotaResponse.json();
          
          // 检查用户是否有足够的字符额度
          const { permanentQuota, temporaryQuota, usedCharacters, quotaExpiry } = quotaData.characterQuota;
          const totalQuota = permanentQuota + (quotaExpiry && new Date(quotaExpiry) > new Date() ? temporaryQuota : 0);
          const remainingQuota = totalQuota - usedCharacters;

          if (remainingQuota < text.length) {
            toast({
              title: t("error"),
              description: t("字符额度不足"),
              variant: "destructive",
            });
            return;
          }
          quotaCheckPassed = true;
        } else {
          console.error('获取用户配额失败，继续执行语音合成');
          // 如果获取配额失败，记录错误但继续执行
          toast({
            title: t("提示"),
            description: "配额检查暂时不可用，但您仍可以使用语音合成功能",
          });
        }
      } catch (error) {
        console.error('配额检查出错，继续执行语音合成:', error);
        toast({
          title: t("提示"),
          description: "配额检查暂时不可用，但您仍可以使用语音合成功能",
        });
      }

      const audioData = await synthesizeSpeech({
        text,
        language: selectedLanguage,
        isFemale: isFemaleVoice,
        speed,
        service: speechService
      });

      if (speechService === 'minimax') {
        const result = await playMinimaxAudio(audioData, speed);
        setAudioVisualizer(result);
        setIsPlaying(true);
      } else {
        const result = await playPollyAudio(audioData, speed);
        setAudioVisualizer(result);
        setIsPlaying(true);
      }
      
      setLastGeneratedAudio(audioData);

      // 只有在配额检查成功的情况下才更新使用量
      if (quotaCheckPassed) {
        try {
          const updateResponse = await fetch('/api/user/update-quota', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              usedCharacters: text.length,
            }),
          });

          if (!updateResponse.ok) {
            console.error('更新字符使用量失败');
          }
        } catch (error) {
          console.error('更新字符使用量时出错:', error);
        }
      }

    } catch (error) {
      console.error("Speech synthesis error:", error);
      toast({
        title: t("error"),
        description: (error as Error).message || t("speechError"),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (!text) {
        toast({
          title: t("noTextError"),
          description: t("pleaseEnterText"),
          variant: "destructive",
        });
        return;
      }

      const audioData = await synthesizeSpeech({
        text,
        language: selectedLanguage,
        isFemale: isFemaleVoice,
        speed,
        service: speechService
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `audio_${selectedLanguage}_${timestamp}.mp3`;
      await downloadAudio(audioData, filename);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: t("error"),
        description: t("downloadError"),
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        // 处理纯文本文件
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setText(content);
        };
        reader.readAsText(file);
      } else if (file.type === 'application/pdf') {
        // 处理 PDF 文件
        toast({
          title: t("error"),
          description: t("pdfNotSupported"),
          variant: "destructive",
        });
      } else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx') || file.name.endsWith('.rtf')) {
        // 处理 Word 文件
        toast({
          title: t("error"),
          description: t("wordNotSupported"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("error"),
          description: t("unsupportedFormat"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: t("error"),
        description: t("uploadError"),
        variant: "destructive",
      });
    }
  };

  const handlePause = () => {
    if (audioVisualizer) {
      audioVisualizer.audioContext.suspend();
      setIsPlaying(false);
    }
  };

  const handleResume = () => {
    if (audioVisualizer) {
      audioVisualizer.audioContext.resume();
      setIsPlaying(true);
    }
  };

  // 跟踪语音服务切换
  const handleServiceChange = (value: SpeechService) => {
    setSpeechService(value);
    analytics.trackEvent('change_service', 'settings', value);
  };

  // 跟踪语言切换
  const handleLanguageChange = (value: string) => {
    setSelectedLanguage(value);
    analytics.trackEvent('change_language', 'settings', value);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-8">
        <Card className="backdrop-blur-sm bg-background/80 border-primary/10 shadow-lg">
          <CardHeader className="border-b border-primary/10 pb-4 md:pb-6 flex justify-center items-center">
            <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent text-center">
              {t('title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
              <Card className="backdrop-blur-sm bg-background/80 border-primary/10 shadow-md">
                <CardHeader className="space-y-1 md:space-y-2">
                  <CardTitle className="text-lg md:text-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    {t('serviceSettings')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="space-y-3 md:space-y-4">
                    <div className="space-y-1.5 md:space-y-2">
                      <Label>{t('speechService')}</Label>
                      <Select
                        value={speechService}
                        onValueChange={handleServiceChange}
                      >
                        <SelectTrigger className="h-9 md:h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aws">AWS Polly</SelectItem>
                          <SelectItem value="minimax">Minimax</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <Label>{t('selectLanguage')}</Label>
                      <Select
                        value={selectedLanguage}
                        onValueChange={handleLanguageChange}
                      >
                        <SelectTrigger className="h-9 md:h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[40vh] overflow-y-auto">
                          {speechService === 'minimax' ? (
                            MINIMAX_LANGUAGES.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {t(lang.nameKey)}
                              </SelectItem>
                            ))
                          ) : (
                            AWS_LANGUAGES.map((lang) => (
                              <SelectItem key={lang.code} value={lang.code}>
                                {t(lang.nameKey)}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <Label>{t('voice')}</Label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {isFemaleVoice ? t('female') : t('male')}
                        </span>
                        <Switch
                          checked={isFemaleVoice}
                          onCheckedChange={setIsFemaleVoice}
                          disabled={hasSingleVoice(selectedLanguage, speechService)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <Label>{t('wordByWord')}</Label>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {isWordByWord ? t('on') : t('off')}
                        </span>
                        <Switch
                          checked={isWordByWord}
                          onCheckedChange={setIsWordByWord}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <Label>{t('speed')}: {speed}x</Label>
                      <Slider
                        value={[speed]}
                        onValueChange={([value]) => setSpeed(value)}
                        min={0.5}
                        max={2}
                        step={0.1}
                        className="py-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-sm bg-background/80 border-primary/10 shadow-md">
                <CardHeader className="space-y-1 md:space-y-2">
                  <CardTitle className="text-lg md:text-xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    {t('readText')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4">
                  <div className="relative">
                    <Textarea
                      placeholder={t('inputPlaceholder')}
                      className="min-h-[120px] md:min-h-[200px] bg-background/70 backdrop-blur-sm border-primary/20 focus:border-primary/40 transition-all duration-300 resize-none text-sm md:text-base"
                      value={text}
                      onChange={(e) => handleTextChange(e.target.value)}
                      maxLength={SERVICE_LIMITS[speechService]}
                    />
                    <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                      {text.length}/{SERVICE_LIMITS[speechService].toLocaleString()} {t('characters')}
                    </div>
                  </div>
                  
                  {audioVisualizer && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      className="w-full"
                    >
                      <AudioVisualizer 
                        audioContext={audioVisualizer.audioContext}
                        audioSource={audioVisualizer.source}
                        onPause={handlePause}
                        onResume={handleResume}
                        isPlaying={isPlaying}
                      />
                    </motion.div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 md:gap-4">
                    <RequireAuth>
                      <Button 
                        onClick={handleSpeak} 
                        className="flex-1 h-9 md:h-10 text-sm bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300"
                      >
                        <Volume2 className="mr-2 h-4 w-4" />
                        {t('readText')}
                      </Button>
                    </RequireAuth>

                    {audioVisualizer && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      >
                        <RequireAuth>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={isPlaying ? handlePause : handleResume}
                            className="h-9 md:h-10 w-9 md:w-10 border-primary/20 hover:border-primary/40"
                          >
                            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                        </RequireAuth>
                      </motion.div>
                    )}

                    <RequireAuth>
                      <Button 
                        variant="outline" 
                        onClick={handleDownload}
                        className="flex-1 h-9 md:h-10 text-sm border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {t('downloadAudio')}
                      </Button>
                    </RequireAuth>

                    <RequireAuth>
                      <Button
                        variant="outline"
                        className="flex-1 h-9 md:h-10 text-sm border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                        asChild
                      >
                        <label>
                          <Upload className="mr-2 h-4 w-4" />
                          {t('uploadFile')}
                          <input
                            type="file"
                            className="hidden"
                            accept=".txt,.md"
                            onChange={handleFileUpload}
                          />
                        </label>
                      </Button>
                    </RequireAuth>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
} 
import { SynthesizeSpeechCommand, SynthesizeSpeechCommandInput, LanguageCode, VoiceId } from "@aws-sdk/client-polly";
import { pollyClient } from "./aws-config";
import { AudioCache } from './audio-cache';

// 语音配置映射
const voiceIdMap = {
  "en-US": {
    female: "Salli" as VoiceId,
    male: "Justin" as VoiceId
  },
  "en-GB": {
    female: "Emma" as VoiceId,
    male: "Brian" as VoiceId
  },
  "en-AU": {
    female: "Nicole" as VoiceId,
    male: "Russell" as VoiceId
  },
  "zh-CN": {
    female: "Zhiyu" as VoiceId,
    male: "Zhiyu" as VoiceId
  },
  "fr-FR": {
    female: "Celine" as VoiceId,
    male: "Mathieu" as VoiceId
  },
  "es-ES": {
    female: "Conchita" as VoiceId,
    male: "Enrique" as VoiceId
  },
  "es-MX": {
    female: "Mia" as VoiceId,
    male: "Andres" as VoiceId
  },
  "de-DE": {
    female: "Marlene" as VoiceId,
    male: "Hans" as VoiceId
  },
  "it-IT": {
    female: "Carla" as VoiceId,
    male: "Giorgio" as VoiceId
  },
  "ja-JP": {
    female: "Mizuki" as VoiceId,
    male: "Takumi" as VoiceId
  },
  "ko-KR": {
    female: "Seoyeon" as VoiceId,
    male: "Seoyeon" as VoiceId
  },
  "pt-BR": {
    female: "Vitoria" as VoiceId,
    male: "Ricardo" as VoiceId
  },
  "pt-PT": {
    female: "Ines" as VoiceId,
    male: "Cristiano" as VoiceId
  },
  "pl-PL": {
    female: "Ewa" as VoiceId,
    male: "Jacek" as VoiceId
  },
  "ru-RU": {
    female: "Tatyana" as VoiceId,
    male: "Maxim" as VoiceId
  },
  "tr-TR": {
    female: "Filiz" as VoiceId,
    male: "Filiz" as VoiceId
  },
  "hi-IN": {
    female: "Aditi" as VoiceId,
    male: "Aditi" as VoiceId
  }
};

const languageCodeMap = {
  "en-US": "en-US" as LanguageCode,
  "en-GB": "en-GB" as LanguageCode,
  "en-AU": "en-AU" as LanguageCode,
  "zh-CN": "cmn-CN" as LanguageCode,
  "fr-FR": "fr-FR" as LanguageCode,
  "es-ES": "es-ES" as LanguageCode,
  "es-MX": "es-MX" as LanguageCode,
  "de-DE": "de-DE" as LanguageCode,
  "it-IT": "it-IT" as LanguageCode,
  "ja-JP": "ja-JP" as LanguageCode,
  "ko-KR": "ko-KR" as LanguageCode,
  "pt-BR": "pt-BR" as LanguageCode,
  "pt-PT": "pt-PT" as LanguageCode,
  "pl-PL": "pl-PL" as LanguageCode,
  "ru-RU": "ru-RU" as LanguageCode,
  "tr-TR": "tr-TR" as LanguageCode,
  "hi-IN": "hi-IN" as LanguageCode
};

// Minimax声音配置
const minimaxVoiceMap = {
  female: {
    zh: 'female-chengshu',
    en: 'female-chengshu',
    ja: 'female-chengshu',
    ko: 'female-chengshu',
    es: 'female-chengshu',
    fr: 'female-chengshu',
    ru: 'female-chengshu',
    it: 'female-chengshu',
    pt: 'female-chengshu',
    de: 'female-chengshu'
  },
  male: {
    zh: 'male-qn-qingse',
    en: 'male-qn-qingse',
    ja: 'male-qn-qingse',
    ko: 'male-qn-qingse',
    es: 'male-qn-qingse',
    fr: 'male-qn-qingse',
    ru: 'male-qn-qingse',
    it: 'male-qn-qingse',
    pt: 'male-qn-qingse',
    de: 'male-qn-qingse'
  }
};

export type SpeechService = 'aws' | 'minimax';

export interface SpeechOptions {
  text: string;
  language: string;
  isFemale: boolean;
  speed: number;
  service: SpeechService;
}

export async function synthesizeSpeech({
  text,
  language,
  isFemale,
  speed,
  service
}: SpeechOptions): Promise<ArrayBuffer> {
  // 1. 检查缓存
  const cacheKey = AudioCache.getCacheKey({
    text,
    language,
    isFemale,
    speed,
    service
  });
  
  const cachedAudio = AudioCache.get(cacheKey);
  if (cachedAudio) {
    return cachedAudio;
  }

  // 2. 根据服务选择生成方式
  let audioData: ArrayBuffer;
  if (service === 'minimax' && isMinimaxSupported(language)) {
    audioData = await synthesizeWithMinimax(text, language, isFemale);
  } else {
    if (service === 'minimax') {
      throw new Error(`Minimax不支持${language}语言的语音合成,已自动切换到AWS Polly`);
    }
    audioData = await synthesizeWithPolly(text, language, isFemale, speed);
  }

  // 3. 存入缓存
  AudioCache.set(cacheKey, audioData);
  
  return audioData;
}

// Minimax支持的语言代码映射
const minimaxLanguageMap = {
  'zh-CN': 'zh',
  'en-US': 'en',
  'ja-JP': 'ja',
  'ko-KR': 'ko',
  'es-ES': 'es',
  'fr-FR': 'fr',
  'ru-RU': 'ru',
  'it-IT': 'it',
  'pt-PT': 'pt',
  'de-DE': 'de',
  'id-ID': 'id'
} as const;

function isMinimaxSupported(language: string): boolean {
  return language in minimaxLanguageMap;
}

function getMinimaxLanguageCode(pollyLanguage: string): string {
  return minimaxLanguageMap[pollyLanguage as keyof typeof minimaxLanguageMap] || pollyLanguage;
}

async function synthesizeWithMinimax(text: string, language: string, isFemale: boolean): Promise<ArrayBuffer> {
  const minimaxLanguage = getMinimaxLanguageCode(language);
  // 非中文固定使用女声
  const voiceId = language === 'zh-CN' 
    ? (isFemale ? minimaxVoiceMap.female[minimaxLanguage as keyof typeof minimaxVoiceMap.female]
                : minimaxVoiceMap.male[minimaxLanguage as keyof typeof minimaxVoiceMap.male])
    : minimaxVoiceMap.female[minimaxLanguage as keyof typeof minimaxVoiceMap.female];

  const response = await fetch('/api/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      language: minimaxLanguage,
      voiceId
    }),
  });

  if (!response.ok) {
    throw new Error('语音生成失败');
  }

  return await response.arrayBuffer();
}

// 优化 Polly 合成函数
async function synthesizeWithPolly(
  text: string,
  language: string,
  isFemale: boolean,
  speed: number
): Promise<ArrayBuffer> {
  try {
    const voices = voiceIdMap[language as keyof typeof voiceIdMap] || voiceIdMap["en-US"];
    const voiceId = isFemale ? voices.female : voices.male;
    const languageCode = languageCodeMap[language as keyof typeof languageCodeMap] || languageCodeMap["en-US"];

    // 使用 AbortController 设置超时
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10秒超时

    const input: SynthesizeSpeechCommandInput = {
      Engine: "standard",
      LanguageCode: languageCode,
      OutputFormat: "mp3",
      SampleRate: "24000",
      Text: text,
      TextType: "text",
      VoiceId: voiceId,
    };

    const command = new SynthesizeSpeechCommand(input);
    const response = await Promise.race([
      pollyClient.send(command),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Polly 请求超时")), 10000)
      )
    ]);

    clearTimeout(timeout);

    if (!response.AudioStream) {
      throw new Error("No audio stream returned");
    }

    return new Uint8Array(await response.AudioStream.transformToByteArray()).buffer;
  } catch (error) {
    console.error("Error synthesizing speech:", error);
    throw error;
  }
}

interface PlayAudioResult {
  audioContext: AudioContext;
  source: AudioBufferSourceNode;
}

export async function playPollyAudio(audioData: ArrayBuffer, speed: number = 1): Promise<PlayAudioResult> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(audioData);
  
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = speed;
  source.connect(audioContext.destination);
  source.start(0);
  
  return { audioContext, source };
}

export async function downloadAudio(audioData: ArrayBuffer, filename: string) {
  const blob = new Blob([audioData], { type: 'audio/mp3' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function hasSingleVoice(language: string, service?: SpeechService): boolean {
  // Minimax模式下，只有中文支持选择音色
  if (service === 'minimax') {
    return language !== 'zh-CN';
  }

  // AWS Polly模式下的逻辑
  const voices = voiceIdMap[language as keyof typeof voiceIdMap];
  if (!voices) return false;
  return voices.female === voices.male;
}

export const minimaxLanguages = {
  'zh-CN': 'zh',
  'en-US': 'en',
  'ja-JP': 'ja',
  'ko-KR': 'ko',
  'es-ES': 'es',
  'fr-FR': 'fr',
  'ru-RU': 'ru',
  'it-IT': 'it',
  'pt-PT': 'pt',
  'de-DE': 'de',
} as const;

export async function playMinimaxAudio(audioData: ArrayBuffer, speed: number = 1): Promise<PlayAudioResult> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  try {
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.playbackRate.value = speed;
    source.connect(audioContext.destination);
    source.start(0);
    
    return { audioContext, source };
  } catch (error) {
    audioContext.close();
    throw error;
  }
} 
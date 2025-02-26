import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Voice Studio - Professional Voice Synthesis Workspace',
  description: 'Create professional-grade voice content with our advanced AI voice synthesis studio. Features real-time preview, multi-voice support, and precise control over speed, pitch, and emotion.',
  metadataBase: new URL('https://voicecanvas.org'),
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/apple-touch-icon-precomposed.png',
    },
  },
  openGraph: {
    title: 'Voice Studio - Professional Voice Synthesis Workspace',
    description: 'Create professional-grade voice content with our advanced AI voice synthesis studio. Features real-time preview, multi-voice support, and precise control over speed, pitch, and emotion.',
    url: 'https://voicecanvas.org',
    siteName: 'VoiceCanvas',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/studio-og.png',
        width: 1200,
        height: 630,
        alt: 'VoiceCanvas Studio Interface',
        type: 'image/png'
      },
      {
        url: '/images/studio-og-square.png',
        width: 1080,
        height: 1080,
        alt: 'VoiceCanvas Studio Interface Square',
        type: 'image/png'
      }
    ]
  },
  twitter: {
    title: 'Voice Studio - Professional Voice Synthesis Workspace',
    description: 'Create professional-grade voice content with our advanced AI voice synthesis studio. Features real-time preview, multi-voice support, and precise control over speed, pitch, and emotion.',
    card: 'summary_large_image',
    images: {
      url: '/images/studio-twitter.png',
      alt: 'VoiceCanvas Studio Interface',
      width: 1200,
      height: 630
    },
    creator: '@VoiceCanvas',
    site: '@VoiceCanvas'
  },
  other: {
    'og:image:secure_url': 'https://voicecanvas.org/images/studio-og.png',
    'pinterest-rich-pin': 'true',
    'fb:app_id': '',
    'article:author': 'https://voicecanvas.org',
    'article:publisher': 'https://voicecanvas.org'
  }
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
} 
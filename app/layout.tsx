import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LumiSort · AI 智能筛片',
  description: '自动识别人像与风景照片的模糊、失焦和曝光问题，支持 15 项自定义质量检测。',
  metadataBase: new URL('https://lumisort-ai-portrait-culling.haoy6092.chatgpt.site'),
  openGraph: {
    title: 'LumiSort · AI 智能筛片',
    description: '人像与风景通用，支持 15 项可自定义的 AI 照片质量检测。',
    images: [{ url: '/og.png', width: 1672, height: 941 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LumiSort · AI 智能筛片',
    description: '人像与风景通用，支持 15 项可自定义的 AI 照片质量检测。',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

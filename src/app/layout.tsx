import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'WalCare — 3D Clinical Memory & Biometrics on Walrus',
  description:
    'Decentralized clinical memory, real-time biometrics, and 3D holographic health intelligence for continuous care powered by Walrus Protocol and KIRO Healthcare Intelligence.',
  keywords: [
    'WalCare',
    'Walrus Protocol',
    'MemWal',
    'Walrus Memory',
    'AI Healthcare',
    'Sui Blockchain',
    'Chatbots That Remember',
  ],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full flex flex-col overflow-hidden`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

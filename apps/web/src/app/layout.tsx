import '@extramile/ui/tokens.css';
import './globals.css';

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';

// Apple devices render SF via -apple-system; Inter is the closest match elsewhere.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'ExtraMile Electronics',
    template: '%s · ExtraMile Electronics',
  },
  description:
    'Genuine phones, laptops, TVs and audio in Accra — real stock, real warranties, pay by mobile money or card.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f5f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';
import AppShell from './AppShell';

export const metadata: Metadata = {
  title: {
    default: 'GlobalDramaVerseGuide (GDVG)',
    template: '%s | Global Drama Verse Guide',
  },
  description: 'Global Drama Verse Guide (GDVG) is your ultimate destination for tracking, discovering, and watching the best TV series and movies globally. Explore K-Dramas, Anime, Western Series, and more.',
  keywords: ['KDrama', 'Anime', 'TV Series', 'Movies', 'Global Drama', 'Drama Guide', 'Watch Online'],
  openGraph: {
    type: 'website',
    siteName: 'Global Drama Verse Guide',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0b0b',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0b0b0b]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

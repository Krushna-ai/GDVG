import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { fetchPublishedContent, fetchTopRated, fetchRecentlyAdded } from '@/services/contentService';
import HomePageClient from './HomePageClient';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Watch Movies & TV Series Online',
  description: 'Global Drama Verse Guide (GDVG) is your ultimate destination for tracking, discovering, and watching the best TV series and movies globally. Explore K-Dramas, Anime, Western Series, and more.',
};

export default async function HomePage() {
  let popular: any[] = [];
  let topRated: any[] = [];
  let recent: any[] = [];

  try {
    const supabase = await createClient();
    [popular, topRated, recent] = await Promise.all([
      fetchPublishedContent(100, supabase),
      fetchTopRated(20, supabase),
      fetchRecentlyAdded(20, supabase),
    ]);
  } catch (error) {
    console.warn('Homepage data fetch failed - Supabase may not be configured:', error);
  }

  return <HomePageClient dramas={popular} topRated={topRated} recentlyAdded={recent} />;
}

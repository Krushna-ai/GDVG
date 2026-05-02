import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { fetchPublishedContent } from '@/services/contentService';
import MoviesCatalogClient from '../MoviesCatalogClient';

export const metadata: Metadata = {
  title: 'Movies',
  description: 'Browse and discover the best movies from around the world on Global Drama Verse Guide.',
};

export default async function MoviesCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  let dramas: any[] = [];

  try {
    const supabase = await createClient();
    const params = await searchParams;
    dramas = await fetchPublishedContent(1000, supabase);
    return (
      <MoviesCatalogClient
        dramas={dramas}
        initialGenre={params.genre || null}
      />
    );
  } catch (error) {
    console.warn('Movies catalog data fetch failed - Supabase may not be configured:', error);
    return (
      <MoviesCatalogClient
        dramas={[]}
        initialGenre={null}
      />
    );
  }
}

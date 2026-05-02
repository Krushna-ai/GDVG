import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { fetchPublishedContent } from '@/services/contentService';
import SeriesCatalogClient from '../SeriesCatalogClient';

export const metadata: Metadata = {
  title: 'TV Series',
  description: 'Browse and discover the best TV series from around the world on Global Drama Verse Guide.',
};

export default async function SeriesCatalogPage({
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
      <SeriesCatalogClient
        dramas={dramas}
        initialGenre={params.genre || null}
      />
    );
  } catch (error) {
    console.warn('Series catalog data fetch failed - Supabase may not be configured:', error);
    return (
      <SeriesCatalogClient
        dramas={[]}
        initialGenre={null}
      />
    );
  }
}

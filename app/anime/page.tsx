export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import SeriesCatalogClient from '../SeriesCatalogClient';

export const metadata: Metadata = {
  title: 'Anime',
  description: 'Browse and discover the best anime series and movies from Japan and beyond on GDVG.',
};

export default async function AnimeCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ genre?: string }>;
}) {
  let dramas: any[] = [];
  let totalCount = 0;

  try {
    const supabase = await createClient();
    const params = await searchParams;
    const [{ data }, { count }] = await Promise.all([
      supabase
        .from('content')
        .select(`
          id, gdvg_id, title, content_type,
          poster_path, vote_average, popularity,
          origin_country, first_air_date,
          release_date, genres, status
        `)
        .eq('status', 'published')
        .eq('content_type', 'anime')
        .order('popularity', { ascending: false })
        .range(0, 23),
      supabase
        .from('content')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .eq('content_type', 'anime'),
    ]);
    dramas = data || [];
    totalCount = count || 0;
    return (
      <SeriesCatalogClient
        dramas={dramas}
        initialGenre={params.genre || null}
        type="Anime"
        contentTypeParam="anime"
        totalCount={totalCount}
      />
    );
  } catch (error) {
    console.warn('Anime catalog fetch failed:', error);
    return (
      <SeriesCatalogClient
        dramas={[]}
        initialGenre={null}
        type="Anime"
        contentTypeParam="anime"
        totalCount={0}
      />
    );
  }
}

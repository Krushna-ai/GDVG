export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import SeriesCatalogClient from '../SeriesCatalogClient';

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
        .eq('content_type', 'movie')
        .order('popularity', { ascending: false })
        .range(0, 23),
      supabase
        .from('content')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .eq('content_type', 'movie'),
    ]);
    dramas = data || [];
    totalCount = count || 0;
    return (
      <SeriesCatalogClient
        dramas={dramas}
        initialGenre={params.genre || null}
        type="Movies"
        contentTypeParam="movie"
        totalCount={totalCount}
      />
    );
  } catch (error) {
    console.warn('Movies catalog data fetch failed - Supabase may not be configured:', error);
    return (
      <SeriesCatalogClient
        dramas={[]}
        initialGenre={null}
        type="Movies"
        contentTypeParam="movie"
        totalCount={0}
      />
    );
  }
}

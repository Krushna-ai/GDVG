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

  try {
    const supabase = await createClient();
    const params = await searchParams;
    const { data } = await supabase
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
      .range(0, 23);
    dramas = data || [];
    return (
      <SeriesCatalogClient
        dramas={dramas}
        initialGenre={params.genre || null}
        type="Movies"
        contentTypeParam="movie"
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
      />
    );
  }
}

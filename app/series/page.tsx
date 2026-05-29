import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import SeriesCatalogClient from '../SeriesCatalogClient';

export const metadata: Metadata = {
  title: 'Dramas',
  description: 'Browse and discover the best Korean dramas, Asian dramas, and TV series from around the world on Global Drama Verse Guide.',
};

export default async function SeriesCatalogPage({
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
        .in('content_type', ['tv', 'drama'])
        .order('popularity', { ascending: false })
        .range(0, 23),
      supabase
        .from('content')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published')
        .in('content_type', ['tv', 'drama']),
    ]);
    dramas = data || [];
    totalCount = count || 0;
    return (
      <SeriesCatalogClient
        dramas={dramas}
        initialGenre={params.genre || null}
        type="Dramas"
        contentTypeParam="tv,drama"
        totalCount={totalCount}
      />
    );
  } catch (error) {
    console.warn('Series catalog data fetch failed - Supabase may not be configured:', error);
    return (
      <SeriesCatalogClient
        dramas={[]}
        initialGenre={null}
        type="Dramas"
        contentTypeParam="tv,drama"
        totalCount={0}
      />
    );
  }
}

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

  try {
    const supabase = await createClient();
    const params = await searchParams;
    const { data } = await supabase
      .from('content')
      .select('*')
      .eq('status', 'published')
      .eq('content_type', 'anime')
      .order('popularity', { ascending: false })
      .limit(1000);
    dramas = data || [];
    return (
      <SeriesCatalogClient
        dramas={dramas}
        initialGenre={params.genre || null}
        type="Anime"
      />
    );
  } catch (error) {
    console.warn('Anime catalog fetch failed:', error);
    return (
      <SeriesCatalogClient
        dramas={[]}
        initialGenre={null}
        type="Anime"
      />
    );
  }
}

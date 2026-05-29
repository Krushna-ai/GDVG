import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  // 'tv,drama' or 'movie' or 'anime'
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 24;
  const offset = (page - 1) * limit;
  const genre = searchParams.get('genre');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let query = supabase
    .from('content')
    .select(`
      id, gdvg_id, title, content_type,
      poster_path, vote_average, popularity,
      origin_country, first_air_date,
      release_date, genres, status
    `)
    .eq('status', 'published')
    .order('popularity', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by content types
  if (type) {
    const types = type.split(',');
    if (types.length === 1) {
      query = query.eq('content_type', types[0]);
    } else {
      query = query.in('content_type', types);
    }
  }

  // Filter by genre if provided
  if (genre) {
    query = query.contains('genres',
      JSON.stringify([{ name: genre }])
    );
  }

  const { data, error } = await query;

  if (error) {
    return Response.json(
      { error: error.message }, { status: 500 }
    );
  }

  return Response.json({
    data: data || [],
    page,
    hasMore: (data || []).length === limit
  });
}

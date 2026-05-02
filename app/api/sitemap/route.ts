import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gdvg-ten.vercel.app';
const URLS_PER_SITEMAP = 45000;

function createSlug(title: string) {
  if (!title) return '';
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 50);
}

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const page = searchParams.get('page');

  // 1. Generate Sitemap Index if no type is specified
  if (!type) {
    try {
      const { count: moviesCount } = await getSupabase().from('content').select('id', { count: 'exact', head: true }).eq('content_type', 'movie');
      const { count: seriesCount } = await getSupabase().from('content').select('id', { count: 'exact', head: true }).in('content_type', ['tv', 'drama', 'anime', 'variety', 'documentary']);
      const { count: peopleCount } = await getSupabase().from('people').select('id', { count: 'exact', head: true });

      const moviePages = Math.ceil((moviesCount || 0) / URLS_PER_SITEMAP);
      const seriesPages = Math.ceil((seriesCount || 0) / URLS_PER_SITEMAP);
      const peoplePages = Math.ceil((peopleCount || 0) / URLS_PER_SITEMAP);

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <sitemap>
        <loc>${SITE_URL}/sitemap.xml</loc>
    </sitemap>`;

      for (let i = 1; i <= moviePages; i++) {
        xml += `\n    <sitemap><loc>${SITE_URL}/api/sitemap?type=movies&amp;page=${i}</loc></sitemap>`;
      }
      for (let i = 1; i <= seriesPages; i++) {
        xml += `\n    <sitemap><loc>${SITE_URL}/api/sitemap?type=series&amp;page=${i}</loc></sitemap>`;
      }
      for (let i = 1; i <= peoplePages; i++) {
        xml += `\n    <sitemap><loc>${SITE_URL}/api/sitemap?type=people&amp;page=${i}</loc></sitemap>`;
      }

      xml += '\n</sitemapindex>';
      return new Response(xml, {
        headers: { 'Content-Type': 'application/xml' },
      });
    } catch (error) {
      console.error('Sitemap Index Error:', error);
      return new Response('Error generating sitemap index', { status: 500 });
    }
  }

  // 2. Generate Partitioned Sitemap Chunk
  const pageNum = parseInt(page as string) || 1;
  const offset = (pageNum - 1) * URLS_PER_SITEMAP;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  try {
    if (type === 'movies' || type === 'series') {
      const contentTypes = type === 'movies' ? ['movie'] : ['tv', 'drama', 'anime', 'variety', 'documentary'];

      const { data, error } = await getSupabase()
        .from('content')
        .select('gdvg_id, title, updated_at, content_type')
        .in('content_type', contentTypes)
        .range(offset, offset + URLS_PER_SITEMAP - 1)
        .not('gdvg_id', 'is', null)
        .order('id', { ascending: true });

      if (error) throw error;

      data?.forEach((item) => {
        const prefix = type === 'movies' ? 'movies' : 'series';
        const slug = createSlug(item.title);
        const url = `${SITE_URL}/${prefix}/${item.gdvg_id}/${slug}`;
        const lastmod = item.updated_at ? new Date(item.updated_at).toISOString() : new Date().toISOString();

        xml += `\n    <url>\n        <loc>${url}</loc>\n        <lastmod>${lastmod}</lastmod>\n        <changefreq>weekly</changefreq>\n    </url>`;
      });
    } else if (type === 'people') {
      const { data, error } = await getSupabase()
        .from('people')
        .select('gdvg_id, name, updated_at')
        .range(offset, offset + URLS_PER_SITEMAP - 1)
        .not('gdvg_id', 'is', null)
        .order('id', { ascending: true });

      if (error) throw error;

      data?.forEach((person) => {
        const slug = createSlug(person.name);
        const url = `${SITE_URL}/people/${person.gdvg_id}/${slug}`;
        const lastmod = person.updated_at ? new Date(person.updated_at).toISOString() : new Date().toISOString();

        xml += `\n    <url>\n        <loc>${url}</loc>\n        <lastmod>${lastmod}</lastmod>\n        <changefreq>monthly</changefreq>\n    </url>`;
      });
    }

    xml += '\n</urlset>';
    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml' },
    });
  } catch (error) {
    console.error('Sitemap Chunk Error:', error);
    return new Response('Error generating sitemap chunk', { status: 500 });
  }
}

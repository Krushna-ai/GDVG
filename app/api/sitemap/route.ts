import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gdvg-ten.vercel.app').replace(/\/$/, '');
const PAGE_SIZE = 45000;

function slug(title: string): string {
  if (!title) return '';
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 50);
}

function prefix(contentType: string): string {
  switch (contentType) {
    case 'movie':       return 'movies';
    case 'drama':       return 'drama';
    case 'anime':       return 'anime';
    case 'variety':     return 'variety';
    case 'documentary': return 'documentary';
    default:            return 'series'; // tv
  }
}

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(url, key);
}

function xml(body: string) {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}

function urlEntry(loc: string, lastmod: string, changefreq: string, priority: string) {
  return (
    `\n  <url>` +
    `\n    <loc>${loc}</loc>` +
    `\n    <lastmod>${lastmod}</lastmod>` +
    `\n    <changefreq>${changefreq}</changefreq>` +
    `\n    <priority>${priority}</priority>` +
    `\n  </url>`
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const db = supabase();
  const today = new Date().toISOString();

  // ── Sitemap Index ────────────────────────────────────────────────────────────
  if (!type) {
    const { count: peopleCount } = await db
      .from('people')
      .select('id', { count: 'exact', head: true });

    const peoplePages = Math.ceil((peopleCount || 0) / PAGE_SIZE);

    let out = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    out += `\n  <sitemap><loc>${SITE_URL}/api/sitemap?type=static</loc><lastmod>${today}</lastmod></sitemap>`;
    out += `\n  <sitemap><loc>${SITE_URL}/api/sitemap?type=content</loc><lastmod>${today}</lastmod></sitemap>`;
    for (let i = 1; i <= peoplePages; i++) {
      out += `\n  <sitemap><loc>${SITE_URL}/api/sitemap?type=people&amp;page=${i}</loc><lastmod>${today}</lastmod></sitemap>`;
    }
    out += '\n</sitemapindex>';
    return xml(out);
  }

  // ── Static / catalog pages ───────────────────────────────────────────────────
  if (type === 'static') {
    let out = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    out += urlEntry(`${SITE_URL}/`,        today, 'daily',  '1.0');
    out += urlEntry(`${SITE_URL}/series`,  today, 'daily',  '0.9');
    out += urlEntry(`${SITE_URL}/movies`,  today, 'daily',  '0.9');
    out += urlEntry(`${SITE_URL}/people`,  today, 'weekly', '0.7');
    out += '\n</urlset>';
    return xml(out);
  }

  // ── All content (tv, anime, drama, movie …) ──────────────────────────────────
  if (type === 'content') {
    const { data, error } = await db
      .from('content')
      .select('gdvg_id, title, content_type, updated_at')
      .eq('status', 'published')
      .not('gdvg_id', 'is', null)
      .order('popularity', { ascending: false });

    if (error) {
      console.error('Content sitemap error:', error);
      return new Response('Error generating content sitemap', { status: 500 });
    }

    let out = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    for (const item of data || []) {
      const urlPrefix = prefix(item.content_type);
      const s = slug(item.title);
      const loc = s
        ? `${SITE_URL}/${urlPrefix}/${item.gdvg_id}/${s}`
        : `${SITE_URL}/${urlPrefix}/${item.gdvg_id}`;
      const lastmod = item.updated_at ? new Date(item.updated_at).toISOString() : today;
      out += urlEntry(loc, lastmod, 'weekly', '0.7');
    }
    out += '\n</urlset>';
    return xml(out);
  }

  // ── People (paginated — 45k per chunk, 100k+ total) ──────────────────────────
  if (type === 'people') {
    const offset = (page - 1) * PAGE_SIZE;
    const { data, error } = await db
      .from('people')
      .select('gdvg_id, name, updated_at')
      .not('gdvg_id', 'is', null)
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('People sitemap error:', error);
      return new Response('Error generating people sitemap', { status: 500 });
    }

    let out = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
    for (const person of data || []) {
      const s = slug(person.name);
      const loc = s
        ? `${SITE_URL}/people/${person.gdvg_id}/${s}`
        : `${SITE_URL}/people/${person.gdvg_id}`;
      const lastmod = person.updated_at ? new Date(person.updated_at).toISOString() : today;
      out += urlEntry(loc, lastmod, 'monthly', '0.5');
    }
    out += '\n</urlset>';
    return xml(out);
  }

  return new Response('Unknown sitemap type', { status: 400 });
}

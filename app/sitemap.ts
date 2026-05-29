import { createClient } from '@supabase/supabase-js';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 
  'https://gdvg-ten.vercel.app').replace(/\/$/, '');

function slug(title: string): string {
  if (!title) return '';
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function prefix(contentType: string): string {
  switch (contentType) {
    case 'movie': return 'movies';
    case 'drama': return 'drama';
    case 'anime': return 'anime';
    default: return 'series';
  }
}

export default async function sitemap() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Static pages
  const staticPages = [
    { url: `${SITE_URL}/`, lastModified: new Date(), 
      changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${SITE_URL}/series`, lastModified: new Date(), 
      changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${SITE_URL}/movies`, lastModified: new Date(), 
      changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${SITE_URL}/anime`, lastModified: new Date(), 
      changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${SITE_URL}/people`, lastModified: new Date(), 
      changeFrequency: 'weekly' as const, priority: 0.7 },
  ];

  // Content pages
  const { data: content } = await supabase
    .from('content')
    .select('gdvg_id, title, content_type, updated_at')
    .eq('status', 'published')
    .not('gdvg_id', 'is', null)
    .order('popularity', { ascending: false });

  const contentPages = (content || []).map(item => {
    const s = slug(item.title);
    const url = s
      ? `${SITE_URL}/${prefix(item.content_type)}/${item.gdvg_id}/${s}`
      : `${SITE_URL}/${prefix(item.content_type)}/${item.gdvg_id}`;
    return {
      url,
      lastModified: item.updated_at 
        ? new Date(item.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    };
  });

  // People pages (top 10k by popularity only)
  const { data: people } = await supabase
    .from('people')
    .select('gdvg_id, name, updated_at')
    .not('gdvg_id', 'is', null)
    .order('popularity', { ascending: false })
    .limit(10000);

  const peoplePages = (people || []).map(person => {
    const s = slug(person.name);
    const url = s
      ? `${SITE_URL}/people/${person.gdvg_id}/${s}`
      : `${SITE_URL}/people/${person.gdvg_id}`;
    return {
      url,
      lastModified: person.updated_at 
        ? new Date(person.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    };
  });

  return [...staticPages, ...contentPages, ...peoplePages];
}

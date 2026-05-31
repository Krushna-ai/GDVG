import { createClient } from '@supabase/supabase-js';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 
  'https://gdvg-ten.vercel.app').replace(/\/$/, '');

function toSlug(title: string): string {
  if (!title) return 'untitled';
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

function contentPrefix(contentType: string): string {
  switch (contentType) {
    case 'movie': return 'movies';
    case 'drama': return 'drama';
    case 'anime': return 'anime';
    default: return 'series';
  }
}

const staticPages = [
  { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 1.0 },
  { url: `${SITE_URL}/series`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
  { url: `${SITE_URL}/drama`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
  { url: `${SITE_URL}/movies`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
  { url: `${SITE_URL}/anime`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.9 },
  { url: `${SITE_URL}/people`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.7 },
];

export default async function sitemap() {
  // Always return at least static pages — never crash
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: contentItems, error: contentError } = await supabase
      .from('content')
      .select('gdvg_id, title, content_type, updated_at')
      .eq('status', 'published')
      .order('popularity', { ascending: false })
      .limit(5000);

    const { data: peopleItems, error: peopleError } = await supabase
      .from('people')
      .select('gdvg_id, name, updated_at')
      .order('id', { ascending: true })
      .limit(10000);

    const contentUrls = (contentItems || []).map((item) => ({
      url: `${SITE_URL}/${contentPrefix(item.content_type)}/${item.gdvg_id}/${toSlug(item.title)}`,
      lastModified: item.updated_at ? new Date(item.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    const peopleUrls = (peopleItems || []).map((person) => ({
      url: `${SITE_URL}/people/${person.gdvg_id}/${toSlug(person.name)}`,
      lastModified: person.updated_at ? new Date(person.updated_at) : new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    return [...staticPages, ...contentUrls, ...peopleUrls];

  } catch (error) {
    // If anything fails, return static pages so sitemap never 404s
    console.error('Sitemap generation error:', error);
    return staticPages;
  }
}

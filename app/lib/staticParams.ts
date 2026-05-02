import { createPublicClient } from '@/lib/supabase/public';
import { createSlug } from '@/lib/urlHelper';

export async function generateContentStaticParams(contentTypes?: string[], limit = 1000) {
  try {
    const supabase = createPublicClient();

    let query = supabase
      .from('content')
      .select('gdvg_id, title, content_type')
      .eq('status', 'published')
      .not('gdvg_id', 'is', null)
      .order('popularity', { ascending: false })
      .limit(limit);

    if (contentTypes && contentTypes.length > 0) {
      query = query.in('content_type', contentTypes);
    }

    const { data, error } = await query;

    if (error || !data) {
      console.error('Error generating static params:', error);
      return [];
    }

    return data.map((item) => ({
      id: String(item.gdvg_id),
      slug: createSlug(item.title),
    }));
  } catch (error) {
    console.warn('Skipping content static params - Supabase not configured:', error);
    return [];
  }
}

export async function generatePeopleStaticParams(limit = 1000) {
  try {
    const supabase = createPublicClient();

    const { data, error } = await supabase
      .from('people')
      .select('gdvg_id, name')
      .not('gdvg_id', 'is', null)
      .order('popularity', { ascending: false })
      .limit(limit);

    if (error || !data) {
      console.error('Error generating people static params:', error);
      return [];
    }

    return data.map((person) => ({
      id: String(person.gdvg_id),
      slug: createSlug(person.name),
    }));
  } catch (error) {
    console.warn('Skipping people static params - Supabase not configured:', error);
    return [];
  }
}

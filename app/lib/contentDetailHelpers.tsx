import { createClient } from '@/lib/supabase/server';
import { fetchContentBySlug } from '@/services/contentService';
import { buildContentMetadata } from './metadata';
import { buildContentJsonLd } from './jsonLd';
import type { Metadata } from 'next';
import type { Content } from '@/types';

export async function getContentDetail(
  params: { id: string; slug: string }
): Promise<Content | null> {
  const supabase = await createClient();
  const content = await fetchContentBySlug(decodeURIComponent(params.id), supabase);
  return content;
}

export async function generateContentMetadata(
  params: { id: string; slug: string },
  prefix: string
): Promise<Metadata> {
  const content = await getContentDetail(params);
  if (!content) {
    return {
      title: 'Not Found',
    };
  }
  return buildContentMetadata(content, prefix);
}

export function renderContentJsonLd(content: Content) {
  const jsonLd = buildContentJsonLd(content);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

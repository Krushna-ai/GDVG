import { createClient } from '@/lib/supabase/server';
import { getPersonByName } from '@/services/personService';
import { buildPersonMetadata } from './metadata';
import { buildPersonJsonLd } from './jsonLd';
import type { Metadata } from 'next';
import type { Person } from '@/types';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gdvg-ten.vercel.app';

export async function getPersonDetail(
  params: { id: string; slug: string }
): Promise<Person | null> {
  const supabase = await createClient();
  const person = await getPersonByName(decodeURIComponent(params.id), supabase);
  return person;
}

export async function generatePersonMetadata(
  params: { id: string; slug: string }
): Promise<Metadata> {
  const person = await getPersonDetail(params);
  if (!person) {
    return {
      title: 'Not Found',
    };
  }
  return buildPersonMetadata(person);
}

export function renderPersonJsonLd(person: Person) {
  const slug = person.name ? person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 50) : '';
  const canonicalUrl = `${SITE_URL}/people/${person.gdvg_id}/${slug}`;
  const jsonLd = buildPersonJsonLd(person, canonicalUrl);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

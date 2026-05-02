import type { Metadata } from 'next';
import type { Content, Person } from '@/types';
import { getPosterUrl, getProfileUrl } from '@/lib/tmdbImages';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gdvg-ten.vercel.app';

export function buildContentMetadata(content: Content, prefix: string): Metadata {
  const posterUrl = getPosterUrl(content.poster_path) || '';
  const canonicalUrl = `${SITE_URL}/${prefix}/${content.gdvg_id}/${content.title ? content.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 50) : ''}`;

  return {
    title: content.title,
    description: content.overview || `Watch ${content.title} on Global Drama Verse Guide.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: content.content_type === 'movie' ? 'video.movie' : 'video.tv_show',
      title: content.title,
      description: content.overview || '',
      images: posterUrl ? [posterUrl] : undefined,
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: content.title,
      description: content.overview || '',
      images: posterUrl ? [posterUrl] : undefined,
    },
  };
}

export function buildPersonMetadata(person: Person): Metadata {
  const profileUrl = getProfileUrl(person.profile_path) || '';
  const canonicalUrl = `${SITE_URL}/people/${person.gdvg_id}/${person.name ? person.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 50) : ''}`;

  return {
    title: person.name,
    description: person.biography || `Learn more about ${person.name} on Global Drama Verse Guide.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'profile',
      title: person.name,
      description: person.biography || '',
      images: profileUrl ? [profileUrl] : undefined,
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: person.name,
      description: person.biography || '',
      images: profileUrl ? [profileUrl] : undefined,
    },
  };
}

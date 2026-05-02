import type { Content, Person } from '@/types';

export function buildContentJsonLd(content: Content) {
  const isMovie = content.content_type === 'movie';
  const posterUrl = content.poster_path
    ? `https://image.tmdb.org/t/p/w500${content.poster_path}`
    : undefined;

  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': isMovie ? 'Movie' : 'TVSeries',
    name: content.title,
    description: content.overview,
    image: posterUrl,
    datePublished: content.first_air_date || content.release_date,
    numberOfEpisodes: content.number_of_episodes,
    countryOfOrigin: content.origin_country?.[0],
    inLanguage: content.original_language,
    genre: content.genres?.map((g) => g.name),
  };

  if (content.vote_average !== undefined && content.vote_average !== null) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: content.vote_average,
      bestRating: 10,
      ratingCount: content.vote_count || 0,
    };
  }

  return jsonLd;
}

export function buildPersonJsonLd(person: Person, canonicalUrl: string) {
  const profileUrl = person.profile_path
    ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
    : undefined;

  const sameAs = [
    person.homepage,
    person.social_ids?.instagram ? `https://instagram.com/${person.social_ids.instagram}` : null,
    person.social_ids?.twitter ? `https://twitter.com/${person.social_ids.twitter}` : null,
    person.external_ids?.facebook_id ? `https://facebook.com/${person.external_ids.facebook_id}` : null,
    person.imdb_id ? `https://imdb.com/name/${person.imdb_id}` : null,
  ].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    image: profileUrl,
    description: person.biography,
    jobTitle: person.known_for_department,
    url: canonicalUrl,
    sameAs,
  };
}

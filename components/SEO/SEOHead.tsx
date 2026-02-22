
import React from 'react';
import { Helmet } from 'react-helmet-async';
import type { Drama, Person } from '../../types';

interface SEOHeadProps {
    title: string;
    description: string;
    image?: string;
    type?: 'website' | 'article' | 'video.movie' | 'video.tv_show' | 'profile';
    drama?: any; // If provided, generates Rich Results (JSON-LD)
    person?: Person; // Generate Person Rich Results
    breadcrumbs?: { name: string, url: string }[]; // For BreadcrumbList schema
    keywords?: string[]; // Add keywords support
}

const SEOHead: React.FC<SEOHeadProps> = ({
    title,
    description,
    image = '/og-default.jpg',
    type = 'website',
    drama,
    person,
    breadcrumbs = [],
    keywords = []
}) => {
    const siteName = 'Global Drama Verse Guide';
    const fullTitle = `${title} | ${siteName}`;

    let jsonLd: any = null;
    let breadcrumbLd: any = null;

    if (breadcrumbs.length > 0) {
        breadcrumbLd = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": breadcrumbs.map((crumb, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": crumb.name,
                "item": crumb.url
            }))
        };
    }

    if (drama) {
        // Fallback checks and dynamic assignment for properties
        const isMovie = drama.content_type?.toLowerCase() === 'movie' || drama.category?.toLowerCase() === 'movie';
        const posterUrl = drama.poster_path ? `https://image.tmdb.org/t/p/w500${drama.poster_path}` : drama.posterUrl;

        jsonLd = {
            "@context": "https://schema.org",
            "@type": isMovie ? "Movie" : "TVSeries",
            "name": drama.title || drama.name,
            "image": posterUrl,
            "description": drama.overview || drama.synopsis,
            "datePublished": (drama.year || '').toString(),
            "countryOfOrigin": drama.country,
            "genre": drama.genres,
            "actor": (drama.cast || []).map(actor => ({
                "@type": "Person",
                "name": actor
            })),
            "aggregateRating": drama.statistics ? {
                "@type": "AggregateRating",
                "ratingValue": drama.statistics.score,
                "bestRating": "10",
                "ratingCount": drama.statistics.watchers
            } : undefined
        };
    } else if (person) {
        jsonLd = {
            "@context": "https://schema.org",
            "@type": "Person",
            "name": person.name,
            "image": person.profile_path ? `https://image.tmdb.org/t/p/w500${person.profile_path}` : undefined,
            "description": person.biography,
            "jobTitle": person.known_for_department,
            "url": window.location.href,
            "sameAs": [
                person.homepage,
                person.social_ids?.instagram ? `https://instagram.com/${person.social_ids.instagram}` : null,
                person.social_ids?.twitter ? `https://twitter.com/${person.social_ids.twitter}` : null,
                person.external_ids?.facebook_id ? `https://facebook.com/${person.external_ids.facebook_id}` : null,
                person.imdb_id ? `https://imdb.com/name/${person.imdb_id}` : null
            ].filter(Boolean)
        };
    }

    return (
        <Helmet>
            {/* Standard Metadata */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={window.location.href} />
            {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:site_name" content={siteName} />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />

            {/* Structured Data (JSON-LD) */}
            {jsonLd && (
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
            )}

            {breadcrumbLd && (
                <script type="application/ld+json">
                    {JSON.stringify(breadcrumbLd)}
                </script>
            )}
        </Helmet>
    );
};

export default SEOHead;

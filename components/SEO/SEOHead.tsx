
import React from 'react';
import { Helmet } from 'react-helmet-async';
import type { Drama } from '../../types';

interface SEOHeadProps {
    title: string;
    description: string;
    image?: string;
    type?: 'website' | 'article' | 'video.movie' | 'video.tv_show';
    drama?: Drama; // If provided, generates Rich Results (JSON-LD)
    keywords?: string[]; // Add keywords support
}

const SEOHead: React.FC<SEOHeadProps> = ({
    title,
    description,
    image = '/og-default.jpg',
    type = 'website',
    drama,
    keywords = []
}) => {
    const siteName = 'Global Drama Verse Guide';
    const fullTitle = `${title} | ${siteName}`;

    // Generate JSON-LD for Google Rich Results
    let jsonLd = null;
    if (drama) {
        jsonLd = {
            "@context": "https://schema.org",
            "@type": drama.category === 'Movie' ? "Movie" : "TVSeries",
            "name": drama.title,
            "image": drama.posterUrl,
            "description": drama.synopsis,
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
        </Helmet>
    );
};

export default SEOHead;

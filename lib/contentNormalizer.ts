/**
 * Content Data Normalizer
 * 
 * Ensures JSONB array fields from Supabase are always properly formatted arrays.
 * This prevents runtime errors when accessing array methods like .filter(), .map(), etc.
 */

import type { Content } from '../types';

/**
 * Normalizes a single content item, ensuring all JSONB array fields are proper arrays
 */
export function normalizeContent(content: Content): Content {
    return {
        ...content,
        // Ensure genres is always an array
        genres: Array.isArray(content.genres) ? content.genres : [],

        // Ensure networks is always an array
        networks: Array.isArray(content.networks) ? content.networks : [],

        // Ensure videos is always an array
        videos: Array.isArray(content.videos) ? content.videos : [],

        // Ensure keywords is always an array
        keywords: Array.isArray(content.keywords) ? content.keywords : [],

        // Ensure production_companies is always an array
        production_companies: Array.isArray(content.production_companies)
            ? content.production_companies
            : [],

        // Ensure origin_country is always an array
        origin_country: Array.isArray(content.origin_country)
            ? content.origin_country
            : [],
    };
}

/**
 * Normalizes an array of content items
 */
export function normalizeContentArray(contentArray: Content[]): Content[] {
    return contentArray.map(normalizeContent);
}

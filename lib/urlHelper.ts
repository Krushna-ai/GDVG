import type { Content, Person } from '../types';

/**
 * Get the content type prefix for URLs
 */
export function getContentTypePrefix(contentType: string): string {
    switch (contentType.toLowerCase()) {
        case 'tv':
            return 'series';
        case 'movie':
            return 'movies';
        case 'drama':
            return 'drama';
        case 'anime':
            return 'anime';
        case 'variety':
            return 'variety';
        case 'documentary':
            return 'documentary';
        default:
            return 'title';
    }
}

/**
 * Get content type from URL prefix
 */
export function getContentTypeFromPrefix(prefix: string): string {
    switch (prefix.toLowerCase()) {
        case 'series':
            return 'tv';
        case 'movies':
            return 'movie';
        default:
            return prefix;
    }
}

/**
 * Generate SEO-friendly URL for content (MyDramaList style)
 * Examples:
 *   /series/736993/breaking-bad
 *   /movies/123456/inception
 * REQUIRES gdvg_id - throws error if missing
 */
export function getContentUrl(content: Content): string {
    if (!content.gdvg_id) {
        console.error('Content missing gdvg_id:', content.id, content.title);
        throw new Error(`Content "${content.title}" is missing gdvg_id`);
    }

    const prefix = getContentTypePrefix(content.content_type);
    const title = content.title || '';
    const slug = createSlug(title);

    if (slug) {
        return `/${prefix}/${content.gdvg_id}/${slug}`;
    }

    return `/${prefix}/${content.gdvg_id}`;
}

/**
 * Create URL-friendly slug from title
 */
export function createSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, '')      // Remove leading/trailing hyphens
        .substring(0, 50);            // Limit length
}

/**
 * Generate URL for person pages
 * Example: /people/123456/bryan-cranston
 * REQUIRES gdvg_id - throws error if missing
 */
export function getPersonUrl(person: Person): string {
    if (!person.gdvg_id) {
        console.error('Person missing gdvg_id:', person.id, person.name);
        throw new Error(`Person "${person.name}" is missing gdvg_id. Ensure gdvg_id is selected in database query.`);
    }

    const slug = createSlug(person.name);

    if (slug) {
        return `/people/${person.gdvg_id}/${slug}`;
    }

    return `/people/${person.gdvg_id}`;
}

/**
 * Extract ID from slug-based URL parameter
 * Handles formats like:
 *   - "736993" (GDVG-ID)
 *   - "breaking-bad-6a5562cf" -> extracts "6a5562cf" (8-char short ID) - backward compat
 *   - "breaking-bad-6a5562cf-7748-43c3-a426-be788f87a5ac" -> extracts full UUID (backward compat)
 *   - "6a5562cf-7748-43c3-a426-be788f87a5ac" -> full UUID, return as-is
 * Returns the extracted ID
 */
export function extractIdFromSlug(slugOrId: string): string {
    // Check if it's a pure number (GDVG-ID)
    if (/^\d+$/.test(slugOrId)) {
        return slugOrId;
    }

    // Check if it's a full UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
    if (isUUID) {
        return slugOrId;
    }

    // Try to extract UUID from the end (for backward compatibility with full UUID URLs)
    // UUID pattern: 8-4-4-4-12 hexadecimal characters separated by hyphens
    const uuidMatch = slugOrId.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);

    if (uuidMatch) {
        return uuidMatch[1];
    }

    // Extract 8-char short ID from end (backward compat with old format)
    const parts = slugOrId.split('-');
    const lastPart = parts[parts.length - 1];

    if (/^[0-9a-f]{8}$/i.test(lastPart)) {
        return lastPart;
    }

    // Otherwise, return the original
    return slugOrId;
}

/**
 * Legacy function for backwards compatibility
 */
export function getLegacyUrl(content: Content): string {
    return `/title/${content.id}`;
}

/**
 * URL Helper Functions
 * Generates SEO-friendly URLs based on content type
 */

export interface Content {
    id: string;
    content_type?: string;
    title?: string;
    name?: string;
}

/**
 * Get URL prefix based on content type
 */
export function getContentTypePrefix(contentType?: string): string {
    if (!contentType) return 'title';

    const type = contentType.toLowerCase();

    switch (type) {
        case 'tv':
            return 'series';
        case 'movie':
            return 'movies';
        case 'drama':
            return 'drama';
        case 'anime':
            return 'anime';
        default:
            return 'title';
    }
}

/**
 * Generate SEO-friendly URL for content
 * Examples:
 *   /series/breaking-bad-6a5562cf
 *   /movies/inception-xyz12345
 * Uses first 8 chars of UUID - 4.3B combinations (collision-safe)
 */
export function getContentUrl(content: Content): string {
    const prefix = getContentTypePrefix(content.content_type);
    const title = content.title || content.name || '';

    // Create slug from title
    const slug = createSlug(title);

    // Use first 8 characters of UUID (4.3 billion combinations - collision-safe for realistic volumes)
    const shortId = content.id.substring(0, 8);

    // Combine: /[type]/[slug]-[short-id]
    if (slug) {
        return `/${prefix}/${slug}-${shortId}`;
    }

    // Fallback to just short ID if no title
    return `/${prefix}/${shortId}`;
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
 * Extract ID from slug-based URL parameter
 * Handles formats like:
 *   - "breaking-bad-6a5562cf" -> extracts "6a5562cf" (8-char short ID)
 *   - "breaking-bad-6a5562cf-7748-43c3-a426-be788f87a5ac" -> extracts full UUID (backward compat)
 *   - "6a5562cf-7748-43c3-a426-be788f87a5ac" -> full UUID, return as-is
 * Returns the extracted ID
 */
export function extractIdFromSlug(slugOrId: string): string {
    // Check if it's already a full UUID (at the start)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
    if (isUUID) {
        return slugOrId;
    }

    // Try to extract UUID from the end of the slug (backward compatibility with full UUID URLs)
    // UUID pattern: 8-4-4-4-12 hexadecimal characters separated by hyphens
    const uuidMatch = slugOrId.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);

    if (uuidMatch) {
        return uuidMatch[1];
    }

    // Extract 8-char short ID from end (new shorter format)
    const parts = slugOrId.split('-');
    const lastPart = parts[parts.length - 1];

    if (/^[0-9a-f]{8}$/i.test(lastPart)) {
        return lastPart;
    }

    // Otherwise, return the original (might be a slug without ID or legacy format)
    return slugOrId;
}

/**
 * Legacy function for backwards compatibility
 */
export function getLegacyUrl(content: Content): string {
    return `/title/${content.id}`;
}

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
 *   /series/breaking-bad-abc123
 *   /movies/inception-xyz789
 */
export function getContentUrl(content: Content): string {
    const prefix = getContentTypePrefix(content.content_type);
    const title = content.title || content.name || '';

    // Create slug from title
    const slug = createSlug(title);

    // Get short ID (first 8 characters)
    const shortId = content.id.substring(0, 8);

    // Combine: /[type]/[slug]-[shortid]
    if (slug) {
        return `/${prefix}/${slug}-${shortId}`;
    }

    // Fallback to just ID if no title
    return `/${prefix}/${content.id}`;
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
 * Legacy function for backwards compatibility
 */
export function getLegacyUrl(content: Content): string {
    return `/title/${content.id}`;
}

/**
 * External Links Utilities
 * 
 * Helper functions to build URLs for external reference sites
 */

/**
 * Build TMDB URL for content
 */
export const getTmdbContentUrl = (contentType: 'tv' | 'movie', tmdbId: number): string => {
    return `https://www.themoviedb.org/${contentType}/${tmdbId}`;
};

/**
 * Build TMDB URL for person
 */
export const getTmdbPersonUrl = (tmdbId: number): string => {
    return `https://www.themoviedb.org/person/${tmdbId}`;
};

/**
 * Build IMDB URL
 */
export const getImdbUrl = (imdbId: string): string => {
    return `https://www.imdb.com/title/${imdbId}`;
};

/**
 * Build IMDB URL for person
 */
export const getImdbPersonUrl = (imdbId: string): string => {
    return `https://www.imdb.com/name/${imdbId}`;
};

/**
 * Build Wikipedia URL (already full URL in database)
 */
export const getWikipediaUrl = (url: string): string => {
    return url;
};

/**
 * Build Wikidata URL
 */
export const getWikidataUrl = (wikidataId: string): string => {
    return `https://www.wikidata.org/wiki/${wikidataId}`;
};

// ============ Social Media Links ============

/**
 * Instagram profile URL from handle
 */
export const getInstagramUrl = (handle: string) =>
    `https://instagram.com/${handle.replace('@', '')}`;

/**
 * Twitter/X profile URL from handle
 */
export const getTwitterUrl = (handle: string) =>
    `https://x.com/${handle.replace('@', '')}`;

/**
 * Facebook profile URL from ID
 */
export const getFacebookUrl = (id: string) =>
    `https://facebook.com/${id}`;

/**
 * TikTok profile URL from handle
 */
export const getTiktokUrl = (handle: string) =>
    `https://tiktok.com/@${handle.replace('@', '')}`;

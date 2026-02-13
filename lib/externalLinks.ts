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

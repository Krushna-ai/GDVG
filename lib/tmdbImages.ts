/**
 * TMDB Image URL Helpers
 * Images are stored as paths like '/xyz123.jpg' - must prefix with base URL
 */

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Poster sizes: w92, w154, w185, w342, w500, w780, original
export const getPosterUrl = (path?: string | null, size = 'w500'): string | null => {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

// Backdrop sizes: w300, w780, w1280, original
export const getBackdropUrl = (path?: string | null, size = 'w1280'): string | null => {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

// Profile sizes: w45, w185, h632, original
export const getProfileUrl = (path?: string | null, size = 'w185'): string | null => {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

// Logo sizes: w45, w92, w154, w185, w300, w500, original
export const getLogoUrl = (path?: string | null, size = 'w185'): string | null => {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
};

// Fallback placeholder images
export const PLACEHOLDER_POSTER = 'https://via.placeholder.com/500x750?text=No+Poster';
export const PLACEHOLDER_BACKDROP = 'https://via.placeholder.com/1280x720?text=No+Backdrop';
export const PLACEHOLDER_PROFILE = 'https://via.placeholder.com/185x278?text=No+Photo';

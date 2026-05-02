/**
 * Content Service
 * Unified service for querying content from TMDB-based Supabase schema
 */

import { getSupabaseClient } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Content, CastMember, CrewMember, Review, Discussion, WatchLink } from '../types';
import { normalizeContent, normalizeContentArray } from '../lib/contentNormalizer';

// ============ Public Queries (status = 'published') ============

/**
 * Fetch all published content, ordered by popularity
 */
export const fetchPublishedContent = async (limit = 100, client?: SupabaseClient): Promise<Content[]> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('content')
        .select('*')
        .eq('status', 'published')
        .order('popularity', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return normalizeContentArray(data || []);
};

/**
 * Fetch published content by type (K-Drama, Anime, etc.)
 */
export const fetchContentByType = async (
    contentType: string,
    limit = 20,
    client?: SupabaseClient
): Promise<Content[]> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('content')
        .select('*')
        .eq('status', 'published')
        .eq('content_type', contentType)
        .order('popularity', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return normalizeContentArray(data || []);
};

/**
 * Fetch published content by origin country
 */
export const fetchContentByCountry = async (
    countryCode: string,
    limit = 20,
    client?: SupabaseClient
): Promise<Content[]> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('content')
        .select('*')
        .eq('status', 'published')
        .contains('origin_country', [countryCode])
        .order('popularity', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return normalizeContentArray(data || []);
};

/**
 * Fetch single content by ID (published only for public)
 */
export const fetchContentById = async (id: string, client?: SupabaseClient): Promise<Content | null> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('content')
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
        .single();

    if (error) return null;
    return data ? normalizeContent(data) : null;
};

/**
 * Fetch single content by GDVG-ID (new URL system)
 */
export const fetchContentByGdvgId = async (gdvgId: number | string, client?: SupabaseClient): Promise<Content | null> => {
    const id = typeof gdvgId === 'string' ? parseInt(gdvgId, 10) : gdvgId;
    const sb = client || getSupabaseClient();

    const { data, error } = await sb
        .from('content')
        .select('*')
        .eq('gdvg_id', id)
        .eq('status', 'published')
        .single();

    if (error) return null;
    return data ? normalizeContent(data) : null;
};

/**
 * Fetch content by slug or ID
 * Handles:
 *   - Old slug format: "title_with_underscores"
 *   - New slug-shortid format: "title-slug-6a5562cf" (extracts "6a5562cf")
 *   - Direct UUID: "6a5562cf-7748-43c3-a426-be788f87a5ac"
 */
export const fetchContentBySlug = async (slug: string, client?: SupabaseClient): Promise<Content | null> => {
    const sb = client || getSupabaseClient();
    // Check if it's a pure number (GDVG-ID)
    if (/^\d+$/.test(slug)) {
        return await fetchContentByGdvgId(parseInt(slug, 10), client);
    }

    // Check if it's a direct full UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    if (isUUID) {
        return await fetchContentById(slug, client);
    }

    // Try to extract full UUID from end (backward compatibility)
    const uuidMatch = slug.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    if (uuidMatch) {
        return await fetchContentById(uuidMatch[1], client);
    }

    // Check if it's the slug-shortid format (ends with -[8 hex chars])
    const parts = slug.split('-');
    const lastPart = parts[parts.length - 1];

    if (/^[0-9a-f]{8}$/i.test(lastPart)) {
        const { data, error } = await sb
            .from('content')
            .select('*')
            .eq('status', 'published')
            .filter('id', 'ilike', `${lastPart.toLowerCase()}%`)
            .limit(1);

        if (error || !data || data.length === 0) return null;
        return normalizeContent(data[0]);
    }

    // Fallback to old slug format (title search with underscores)
    const title = slug.replace(/_/g, ' ');

    const { data, error } = await sb
        .from('content')
        .select('*')
        .eq('status', 'published')
        .ilike('title', title)
        .single();

    if (error) return null;
    return data ? normalizeContent(data) : null;
};

/**
 * Search published content by title
 */
export const searchContent = async (query: string, limit = 10, client?: SupabaseClient): Promise<Content[]> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('content')
        .select('id, gdvg_id, title, poster_path, backdrop_path, content_type, release_date, first_air_date, vote_average, origin_country, genres')
        .eq('status', 'published')
        .ilike('title', `%${query}%`)
        .limit(limit);

    if (error) return [];
    return normalizeContentArray((data || []) as unknown as Content[]);
};

/**
 * Fetch similar content by genre
 */
export const fetchSimilarContent = async (
    contentId: string,
    genres: { id: number; name: string }[] | undefined,
    limit = 10,
    client?: SupabaseClient
): Promise<Content[]> => {
    if (!genres || genres.length === 0) return [];

    const genreName = genres[0].name;
    const sb = client || getSupabaseClient();

    const { data, error } = await sb
        .from('content')
        .select('*')
        .eq('status', 'published')
        .neq('id', contentId)
        .order('popularity', { ascending: false })
        .limit(50);

    if (error) return [];

    const normalized = normalizeContentArray(data || []);
    return normalized.filter(item =>
        item.genres?.some((g: any) => g.name === genreName)
    ).slice(0, limit);
};

/**
 * Fetch TMDB recommendations for content (uses new backend enrichment column)
 */
export const fetchRecommendations = async (
    contentId: string,
    limit = 10,
    client?: SupabaseClient
): Promise<Content[]> => {
    const sb = client || getSupabaseClient();
    // Get the source content with recommendations
    const { data: source, error: sourceError } = await sb
        .from('content')
        .select('recommendations')
        .eq('id', contentId)
        .single();

    if (sourceError || !source?.recommendations) return [];

    // Extract tmdb_ids from recommendations array
    const tmdbIds = (source.recommendations as any[])
        .map((r: any) => r.tmdb_id)
        .filter(Boolean)
        .slice(0, limit * 2);

    if (tmdbIds.length === 0) return [];

    // Fetch full content details for published items
    const { data, error } = await sb
        .from('content')
        .select('*')
        .eq('status', 'published')
        .in('tmdb_id', tmdbIds)
        .limit(limit);

    if (error) return [];
    return normalizeContentArray(data || []);
};

// ============ Cast & Crew Queries ============

/**
 * Fetch cast for a content item with person details
 * @param limit - Max cast members to fetch (default 20). Backend enrichment will add 50-200+ cast per content.
 */
export const fetchContentCast = async (contentId: string, limit = 20, client?: SupabaseClient): Promise<CastMember[]> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('content_cast')
        .select(`
      id,
      content_id,
      person_id,
      character_name,
      order_index,
      role_type,
      people!person_id (id, gdvg_id, tmdb_id, name, profile_path, known_for_department)
    `)
        .eq('content_id', contentId)
        .order('order_index', { ascending: true })
        .limit(limit);

    if (error) return [];

    const result = (data || []).map((item: any) => {
        const rawPerson = item.people || item.person;
        return {
            ...item,
            person: Array.isArray(rawPerson) ? rawPerson[0] : rawPerson
        };
    }) as unknown as CastMember[];

    return result;
};

/**
 * Fetch crew for a content item with person details
 * @param limit - Max crew members to fetch (default 20)
 */
export const fetchContentCrew = async (contentId: string, limit = 20, client?: SupabaseClient): Promise<CrewMember[]> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('content_crew')
        .select(`
      id,
      content_id,
      person_id,
      job,
      department,
      people!person_id (id, gdvg_id, tmdb_id, name, profile_path)
    `)
        .eq('content_id', contentId)
        .limit(limit);

    if (error) return [];

    return (data || []).map((item: any) => {
        const rawPerson = item.people || item.person;
        return {
            ...item,
            person: Array.isArray(rawPerson) ? rawPerson[0] : rawPerson
        };
    }) as unknown as CrewMember[];
};

// ============ Admin Queries (all statuses) ============

/**
 * Fetch all content (admin use)
 */
export const fetchAllContent = async (client?: SupabaseClient): Promise<Content[]> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('content')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return normalizeContentArray(data || []);
};

/**
 * Add new content (admin use)
 */
export const addContent = async (content: Partial<Content>, client?: SupabaseClient): Promise<Content> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('content')
        .insert(content)
        .select()
        .single();

    if (error) throw error;
    return normalizeContent(data);
};

/**
 * Update content (admin use)
 */
export const updateContent = async (id: string, content: Partial<Content>, client?: SupabaseClient): Promise<Content> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('content')
        .update({ ...content, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return normalizeContent(data);
};

/**
 * Delete content (admin use)
 */
export const deleteContent = async (id: string, client?: SupabaseClient): Promise<void> => {
    const sb = client || getSupabaseClient();
    const { error } = await sb.from('content').delete().eq('id', id);
    if (error) throw error;
};

// ============ Utility Functions ============

/**
 * Get top rated published content
 */
export const fetchTopRated = async (limit = 10, client?: SupabaseClient): Promise<Content[]> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('content')
        .select('*')
        .eq('status', 'published')
        .order('vote_average', { ascending: false })
        .limit(limit);

    if (error) return [];
    return normalizeContentArray(data || []);
};

/**
 * Get recently added published content
 */
export const fetchRecentlyAdded = async (limit = 10, client?: SupabaseClient): Promise<Content[]> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('content')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return [];
    return normalizeContentArray(data || []);
};

// ============ Reviews & Discussions ============

export const fetchReviews = async (contentId: string, client?: SupabaseClient): Promise<Review[]> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('reviews')
        .select('*')
        .eq('drama_id', contentId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching reviews:', error);
        return [];
    }

    return (data || []).map((row: any) => ({
        id: String(row.id),
        dramaId: String(row.drama_id),
        userId: row.user_id,
        userEmail: row.user_email,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at
    }));
};

export const addReview = async (review: { dramaId: string, userId: string, userEmail: string, rating: number, comment: string }, client?: SupabaseClient): Promise<Review> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('reviews')
        .insert({
            drama_id: review.dramaId,
            user_id: review.userId,
            user_email: review.userEmail,
            rating: review.rating,
            comment: review.comment
        })
        .select()
        .single();

    if (error) throw error;

    return {
        id: String(data.id),
        dramaId: String(data.drama_id),
        userId: data.user_id,
        userEmail: data.user_email,
        rating: data.rating,
        comment: data.comment,
        createdAt: data.created_at
    };
};

export const fetchDiscussions = async (contentId: string, client?: SupabaseClient): Promise<Discussion[]> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('discussions')
        .select('*')
        .eq('drama_id', contentId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching discussions:', error);
        return [];
    }

    return (data || []).map((row: any) => ({
        id: String(row.id),
        dramaId: String(row.drama_id),
        userId: row.user_id,
        title: row.title,
        body: row.body,
        createdAt: row.created_at
    }));
};

export const createDiscussion = async (discussion: { dramaId: string, userId: string, title: string, body: string }, client?: SupabaseClient): Promise<Discussion> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('discussions')
        .insert({
            drama_id: discussion.dramaId,
            user_id: discussion.userId,
            title: discussion.title,
            body: discussion.body
        })
        .select()
        .single();

    if (error) throw error;

    return {
        id: String(data.id),
        dramaId: String(data.drama_id),
        userId: data.user_id,
        title: data.title,
        body: data.body,
        createdAt: data.created_at
    };
};

// ============ Watch Links Queries ============

/**
 * Fetch streaming/watch links for a content item
 */
export const fetchWatchLinks = async (contentId: string, client?: SupabaseClient): Promise<WatchLink[]> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('content_watch_links')
        .select('*')
        .eq('content_id', contentId)
        .order('priority', { ascending: true });

    if (error) {
        console.warn('Failed to fetch watch links:', error.message);
        return [];
    }

    return (data || []).map((item: any) => ({
        id: String(item.id),
        content_id: item.content_id,
        platform_name: item.platform_name,
        region: item.region,
        link_url: item.link_url,
        is_affiliate: item.is_affiliate || false,
        logo_url: item.logo_url,
        priority: item.priority
    }));
};

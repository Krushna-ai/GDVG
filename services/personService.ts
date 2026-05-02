/**
 * Person Service
 * Handles people (actors, directors, crew) with TMDB-aligned schema
 */

import { getSupabaseClient } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Person, Content } from '../types';

// ============ Public Queries ============

/**
 * Fetch people with profile images, ordered by popularity
 * Supports pagination for performance optimization
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Object containing people array and total count
 */
export const fetchAllPeople = async (
    page: number = 1,
    pageSize: number = 200,
    sortBy: 'popularity' | 'credits' = 'popularity',  // NEW: Support sorting by filmography size
    client?: SupabaseClient
): Promise<{ people: Person[], total: number }> => {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Get total count efficiently
    const sb = client || getSupabaseClient();

    // Get total count efficiently
    const { count } = await sb
        .from('people')
        .select('*', { count: 'exact', head: true })
        .not('profile_path', 'is', null);

    // Determine order column
    const orderColumn = sortBy === 'credits' ? 'combined_credits_count' : 'popularity';

    // Get paginated data with dynamic sorting
    const { data, error } = await sb
        .from('people')
        .select('*')
        .not('profile_path', 'is', null)
        .order(orderColumn, { ascending: false, nullsFirst: false })
        .range(from, to);

    if (error) throw error;

    return {
        people: data || [],
        total: count || 0
    };
};

/**
 * Get person by ID
 */
export const getPersonById = async (id: string, client?: SupabaseClient): Promise<Person | null> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('people')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
};

/**
 * Get person by GDVG-ID (new URL system)
 */
export const getPersonByGdvgId = async (gdvgId: number | string, client?: SupabaseClient): Promise<Person | null> => {
    const id = typeof gdvgId === 'string' ? parseInt(gdvgId, 10) : gdvgId;
    const sb = client || getSupabaseClient();

    const { data, error } = await sb
        .from('people')
        .select('*')
        .eq('gdvg_id', id)
        .single();

    if (error) return null;
    return data;
};

/**
 * Get person by name, GDVG-ID, or UUID (handles URL routing)
 * Supports:
 *   - GDVG-ID: "100523" (new format)
 *   - Full UUID: "6a5562cf-7748-43c3-a426-be788f87a5ac"
 *   - Person name: "Neil Dudgeon" (backward compat)
 */
export const getPersonByName = async (nameOrId: string, client?: SupabaseClient): Promise<Person | null> => {
    // Check if it's a pure number (GDVG-ID)
    if (/^\d+$/.test(nameOrId)) {
        return await getPersonByGdvgId(parseInt(nameOrId, 10), client);
    }

    // Check if it's a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nameOrId);
    if (isUUID) {
        return await getPersonById(nameOrId, client);
    }

    // Otherwise treat as name (backward compatibility)
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('people')
        .select('*')
        .ilike('name', nameOrId)
        .limit(1)
        .single();

    if (error) return null;
    return data;
};

/**
 * Search people by name
 */
export const searchPeople = async (query: string, limit = 5, client?: SupabaseClient): Promise<Person[]> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('people')
        .select('id, gdvg_id, tmdb_id, name, profile_path, known_for_department')
        .ilike('name', `%${query}%`)
        .order('popularity', { ascending: false })
        .limit(limit);

    if (error) return [];
    return data || [];
};

/**
 * Get filmography for a person (content they appear in)
 */
export const getFilmographyByPersonId = async (personId: string, client?: SupabaseClient): Promise<Content[]> => {
    const sb = client || getSupabaseClient();
    // Get content IDs from cast
    const { data: castData } = await sb
        .from('content_cast')
        .select('content_id')
        .eq('person_id', personId);

    // Get content IDs from crew  
    const { data: crewData } = await sb
        .from('content_crew')
        .select('content_id')
        .eq('person_id', personId);

    // Combine unique content IDs
    const contentIds = new Set<string>();
    castData?.forEach(c => contentIds.add(c.content_id));
    crewData?.forEach(c => contentIds.add(c.content_id));

    if (contentIds.size === 0) return [];

    // Fetch content details (published only)
    const { data, error } = await sb
        .from('content')
        .select('*')
        .in('id', Array.from(contentIds))
        .eq('status', 'published')
        .order('popularity', { ascending: false });

    if (error) return [];
    return data || [];
};

/**
 * Get filmography by person name (for URL routing)
 */
export const getFilmographyByPersonName = async (name: string, client?: SupabaseClient): Promise<Content[]> => {
    const person = await getPersonByName(name, client);
    if (!person) return [];
    return getFilmographyByPersonId(person.id, client);
};

// ============ Admin Queries ============

/**
 * Add new person (admin use)
 */
export const addPerson = async (person: Partial<Person>, client?: SupabaseClient): Promise<Person> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('people')
        .insert(person)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Update person (admin use)
 */
export const updatePerson = async (id: string, person: Partial<Person>, client?: SupabaseClient): Promise<Person> => {
    const sb = client || getSupabaseClient();
    const { data, error } = await sb
        .from('people')
        .update({ ...person, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

/**
 * Delete person (admin use)
 */
export const deletePerson = async (id: string, client?: SupabaseClient): Promise<void> => {
    const sb = client || getSupabaseClient();
    const { error } = await sb.from('people').delete().eq('id', id);
    if (error) throw error;
};

/**
 * Bulk import people (admin use)
 */
export const bulkImportPeople = async (people: Partial<Person>[], client?: SupabaseClient): Promise<void> => {
    const sb = client || getSupabaseClient();
    const { error } = await sb.from('people').insert(people);
    if (error) throw error;
};

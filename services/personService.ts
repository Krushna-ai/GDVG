/**
 * Person Service
 * Handles people (actors, directors, crew) with TMDB-aligned schema
 */

import { supabase } from '../lib/supabase';
import type { Person, Content } from '../types';

// ============ Public Queries ============

/**
 * Fetch all people, ordered by popularity
 */
export const fetchAllPeople = async (limit = 50): Promise<Person[]> => {
    const { data, error } = await supabase
        .from('people')
        .select('*')
        .order('popularity', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data || [];
};

/**
 * Get person by ID
 */
export const getPersonById = async (id: string): Promise<Person | null> => {
    const { data, error } = await supabase
        .from('people')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
};

/**
 * Get person by name (case-insensitive)
 */
export const getPersonByName = async (name: string): Promise<Person | null> => {
    const { data, error } = await supabase
        .from('people')
        .select('*')
        .ilike('name', name)
        .limit(1)
        .single();

    if (error) return null;
    return data;
};

/**
 * Search people by name
 */
export const searchPeople = async (query: string, limit = 5): Promise<Person[]> => {
    const { data, error } = await supabase
        .from('people')
        .select('id, tmdb_id, name, profile_path, known_for_department')
        .ilike('name', `%${query}%`)
        .order('popularity', { ascending: false })
        .limit(limit);

    if (error) return [];
    return data || [];
};

/**
 * Get filmography for a person (content they appear in)
 */
export const getFilmographyByPersonId = async (personId: string): Promise<Content[]> => {
    // Get content IDs from cast
    const { data: castData } = await supabase
        .from('content_cast')
        .select('content_id')
        .eq('person_id', personId);

    // Get content IDs from crew  
    const { data: crewData } = await supabase
        .from('content_crew')
        .select('content_id')
        .eq('person_id', personId);

    // Combine unique content IDs
    const contentIds = new Set<string>();
    castData?.forEach(c => contentIds.add(c.content_id));
    crewData?.forEach(c => contentIds.add(c.content_id));

    if (contentIds.size === 0) return [];

    // Fetch content details (published only)
    const { data, error } = await supabase
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
export const getFilmographyByPersonName = async (name: string): Promise<Content[]> => {
    const person = await getPersonByName(name);
    if (!person) return [];
    return getFilmographyByPersonId(person.id);
};

// ============ Admin Queries ============

/**
 * Add new person (admin use)
 */
export const addPerson = async (person: Partial<Person>): Promise<Person> => {
    const { data, error } = await supabase
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
export const updatePerson = async (id: string, person: Partial<Person>): Promise<Person> => {
    const { data, error } = await supabase
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
export const deletePerson = async (id: string): Promise<void> => {
    const { error } = await supabase.from('people').delete().eq('id', id);
    if (error) throw error;
};

/**
 * Bulk import people (admin use)
 */
export const bulkImportPeople = async (people: Partial<Person>[]): Promise<void> => {
    const { error } = await supabase.from('people').insert(people);
    if (error) throw error;
};

import { getSupabaseClient } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserListEntry, WatchStatus } from '../types';

export const fetchUserList = async (userId: string, client?: SupabaseClient): Promise<UserListEntry[]> => {
  const sb = client || getSupabaseClient();
  const { data, error } = await sb
    .from('favorites')
    .select('*')
    .eq('user_id', userId);

  if (error) {
      if (error.code === 'PGRST205') return []; 
      throw error;
  }

  return (data || []).map((row: any) => ({
    id: String(row.id),
    dramaId: String(row.drama_id),
    userId: row.user_id,
    status: row.status || 'Plan to Watch',
    progress: row.progress || 0,
    score: row.score || 0
  }));
};

export const updateUserListEntry = async (
    userId: string, 
    dramaId: string, 
    updates: { status: WatchStatus; progress?: number; score?: number },
    client?: SupabaseClient
): Promise<UserListEntry> => {
    const sb = client || getSupabaseClient();
    const { data: existing } = await sb
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('drama_id', dramaId)
        .single();

    let result;
    
    if (existing) {
        const { data, error } = await sb
            .from('favorites')
            .update(updates)
            .eq('id', existing.id)
            .select()
            .single();
        if (error) throw error;
        result = data;
    } else {
        const { data, error } = await sb
            .from('favorites')
            .insert({
                user_id: userId,
                drama_id: dramaId,
                ...updates
            })
            .select()
            .single();
        if (error) throw error;
        result = data;
    }

    return {
        id: String(result.id),
        dramaId: String(result.drama_id),
        userId: result.user_id,
        status: result.status,
        progress: result.progress,
        score: result.score
    };
};

export const removeFromUserList = async (userId: string, dramaId: string, client?: SupabaseClient): Promise<void> => {
    const sb = client || getSupabaseClient();
    const { error } = await sb
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('drama_id', dramaId);
    
    if (error) throw error;
};

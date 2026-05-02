import { getSupabaseClient } from '../lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '../types';

export const getUserProfile = async (userId: string, client?: SupabaseClient): Promise<UserProfile | null> => {
  const sb = client || getSupabaseClient();
  const { data, error } = await sb
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.warn('Profile fetch warning:', error.message);
    return null;
  }

  if (!data) {
      return null;
  }

  return {
    id: data.id,
    username: data.username,
    avatarUrl: data.avatar_url,
    updatedAt: data.updated_at
  };
};

export const createDefaultProfile = async (userId: string, client?: SupabaseClient): Promise<UserProfile | null> => {
    const sb = client || getSupabaseClient();
    const { data: { user } } = await sb.auth.getUser();
    return {
        id: userId,
        username: user?.email?.split('@')[0] || 'User',
        avatarUrl: `https://api.dicebear.com/9.x/adventurer/svg?seed=${userId}`,
        updatedAt: new Date().toISOString()
    };
};

export const updateUserProfile = async (userId: string, updates: { username?: string; avatarUrl?: string }, client?: SupabaseClient): Promise<UserProfile> => {
  const sb = client || getSupabaseClient();
  const { data, error } = await sb
    .from('user_profiles')
    .update({
      username: updates.username,
      avatar_url: updates.avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    username: data.username,
    avatarUrl: data.avatar_url,
    updatedAt: data.updated_at
  };
};

export const upsertUserProfile = async (userId: string, profile: { username: string; avatarUrl: string; email?: string }, client?: SupabaseClient): Promise<UserProfile> => {
    const sb = client || getSupabaseClient();
    const payload: any = {
        id: userId,
        username: profile.username,
        avatar_url: profile.avatarUrl,
    };

    if (profile.email) {
        payload.email = profile.email;
    }

    const { data, error } = await sb
        .from('user_profiles')
        .upsert(payload)
        .select()
        .single();

    if (error) throw error;

    return {
        id: data.id,
        username: data.username,
        avatarUrl: data.avatar_url,
        updatedAt: data.updated_at
    };
};

export const syncGoogleUserData = async (userId: string, metadata: any, client?: SupabaseClient) => {
    try {
        const sb = client || getSupabaseClient();
        const { data: currentProfile } = await sb
            .from('user_profiles')
            .select('avatar_url, username')
            .eq('id', userId)
            .single();

        const googleAvatar = metadata.avatar_url || metadata.picture;
        const googleName = metadata.full_name || metadata.name || metadata.email?.split('@')[0];
        const googleEmail = metadata.email;

        if (!currentProfile) {
            await sb.from('user_profiles').upsert({
                id: userId,
                username: googleName,
                avatar_url: googleAvatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${userId}`,
                email: googleEmail
            }).then(({ error }) => {
                if (error) console.warn("Google sync silent fail (RLS likely):", error.code);
            });
        }
    } catch (err) {
        console.error("Error syncing Google profile:", err);
    }
}

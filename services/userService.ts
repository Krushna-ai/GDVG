
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
    // Silently warn, don't crash
    console.warn('Profile fetch warning:', error.message);
    return null;
  }

  // If profile doesn't exist in DB, return a virtual one (don't try to insert immediately to avoid errors)
  // The App.tsx will detect this 'null' or 'missing' state and trigger the Onboarding Modal.
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

export const createDefaultProfile = async (userId: string): Promise<UserProfile | null> => {
    // DEPRECATED: Logic moved to OnboardingModal to avoid race conditions and RLS errors.
    // Just returning a virtual profile for immediate UI feedback if needed.
    const { data: { user } } = await supabase.auth.getUser();
    return {
        id: userId,
        username: user?.email?.split('@')[0] || 'User',
        avatarUrl: `https://api.dicebear.com/9.x/adventurer/svg?seed=${userId}`,
        updatedAt: new Date().toISOString()
    };
};

export const updateUserProfile = async (userId: string, updates: { username?: string; avatarUrl?: string }): Promise<UserProfile> => {
  const { data, error } = await supabase
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

// Robust function to Insert or Update a profile
export const upsertUserProfile = async (userId: string, profile: { username: string; avatarUrl: string; email?: string }): Promise<UserProfile> => {
    const payload: any = {
        id: userId,
        username: profile.username,
        avatar_url: profile.avatarUrl,
        // We let the database handle 'updated_at' automatically via its default value
    };

    // Include email if provided (required for new profiles due to NOT NULL constraint)
    if (profile.email) {
        payload.email = profile.email;
    }

    const { data, error } = await supabase
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

export const syncGoogleUserData = async (userId: string, metadata: any) => {
    try {
        const { data: currentProfile } = await supabase
            .from('user_profiles')
            .select('avatar_url, username')
            .eq('id', userId)
            .single();

        const googleAvatar = metadata.avatar_url || metadata.picture;
        const googleName = metadata.full_name || metadata.name || metadata.email?.split('@')[0];
        const googleEmail = metadata.email;

        if (!currentProfile) {
            // Attempt creation, but ignore RLS errors silently
            await supabase.from('user_profiles').upsert({
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

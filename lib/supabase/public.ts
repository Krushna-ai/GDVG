import { createClient } from '@supabase/supabase-js';

export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key);
}

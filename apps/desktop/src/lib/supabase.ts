import type { Database } from '@extramile/core';
import { createClient } from '@supabase/supabase-js';

// In-memory session storage — the access token never touches disk (docs/07 §5).
// The refresh token is sealed under the PIN in the OS keychain by AuthProvider.
const mem = new Map<string, string>();
const memoryStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mem.set(k, v);
  },
  removeItem: (k: string) => {
    mem.delete(k);
  },
};

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: memoryStorage,
    },
  },
);

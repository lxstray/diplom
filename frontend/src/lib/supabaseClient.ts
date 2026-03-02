import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // These are required for Version 1 (auth-enabled) flows.
  // For local development, configure them in a .env.local file.
  // We don't throw here to avoid breaking the build, but any
  // auth-related code will fail clearly at call sites.
  console.warn(
    '[supabaseClient] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.',
  );
}

export const supabase = createClient(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
);


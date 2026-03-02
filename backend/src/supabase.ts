import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    '[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. Auth validation will fail.',
  );
}

export const supabaseAdmin = createClient(
  SUPABASE_URL ?? '',
  SUPABASE_SERVICE_ROLE_KEY ?? '',
);


import { createClient } from '@supabase/supabase-js';

// Using Vite environment variables from .env file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing Supabase URL in environment variables');
}

if (!supabaseAnonKey) {
  throw new Error('Missing Supabase Anon Key in environment variables');
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

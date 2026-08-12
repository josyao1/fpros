import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Server-only client using the anon key. Only ever imported from Server
// Actions/Server Components (never a client component), so the key stays
// out of the browser bundle even though it's the anon key. Table access is
// governed by the RLS policy created in supabase/schema.sql. Built lazily so
// a missing env var only breaks the request that needs Supabase, not the
// whole build.
export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables"
    );
  }

  client = createClient(url, anonKey, { auth: { persistSession: false } });
  return client;
}

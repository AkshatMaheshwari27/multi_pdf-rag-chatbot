import { createClient } from "@supabase/supabase-js";

// Hard runtime guard: if this module ever ends up in a browser bundle
// (e.g. accidentally imported from a "use client" component), fail loudly
// instead of silently shipping (or trying to use) a secret key. We don't
// pull in the `server-only` package for this since no new dependencies are
// allowed here — this check is dependency-free and equally effective.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/supabase/server.ts must not be imported in client components or run in the browser. Use lib/supabase/client.ts there instead."
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Missing Supabase server environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in .env.local"
  );
}

/**
 * Server-only Supabase client, authenticated with the secret key.
 *
 * This key has elevated privileges (it can bypass Row Level Security), so
 * this module must only ever run on the server — inside API routes, Server
 * Components, or other server-side code. Never import it from a Client
 * Component ("use client") or send its output to the browser. For
 * browser/client-side access use `lib/supabase/client.ts` instead, which
 * only uses the public URL and publishable key.
 *
 * Sessions are not persisted or auto-refreshed: this client is used for
 * one-off, stateless server-side requests, not for maintaining a logged-in
 * user session (there is no browser storage to persist to anyway).
 */
export const supabaseServer = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

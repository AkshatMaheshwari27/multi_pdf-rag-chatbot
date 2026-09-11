-- ============================================================================
-- match_chunks: pgvector cosine-similarity Top-K retrieval RPC
-- ============================================================================
--
-- PROVENANCE / HONESTY NOTE:
-- This function already exists and is running in the project's Supabase
-- database (it was created directly there, not through this repo). This
-- file exists purely for reproducibility — so the database setup is
-- captured in Git — NOT to be (re-)applied automatically.
--
-- I do not have a tool to run arbitrary SQL against this Supabase project
-- (no SQL Editor / dashboard access, no direct Postgres connection, and
-- Supabase's REST API does not expose pg_catalog/information_schema), so I
-- cannot dump the literal live function body with pg_get_functiondef(). The
-- SQL below was reconstructed from:
--   - the exact signature the function is called with in this codebase
--     (lib/retrieval/search.ts): match_chunks(query_embedding, match_count)
--   - the exact columns that call returns and that the app consumes:
--     id, document_id, filename, page_number, content, similarity
--   - the `documents`/`chunks` schema as given (chunks.document_id
--     references documents.id, chunks.embedding is vector(768))
--   - behavior repeatedly verified against the live function in prior
--     testing: returned similarity scores matched an independent
--     application-layer cosine-similarity calculation to 4 decimal places,
--     and rows with a NULL embedding are never returned.
--
-- If you need a byte-exact copy of what's actually deployed, run this in
-- the Supabase SQL Editor and paste the result over the body below:
--
--   select pg_get_functiondef('public.match_chunks(extensions.vector, integer)'::regprocedure);
--   select
--     grantee, privilege_type
--   from information_schema.role_routine_grants
--   where routine_name = 'match_chunks';
--
-- DO NOT run this file against the database automatically — it is
-- documentation-for-reproducibility, not a migration to apply blindly on
-- top of a function that already exists and is already working.
-- ============================================================================

create or replace function public.match_chunks(
  query_embedding extensions.vector(768),
  match_count integer default 5
)
returns table (
  id bigint,
  document_id bigint,
  filename text,
  page_number integer,
  content text,
  similarity double precision
)
language sql
stable
as $$
  select
    c.id,
    c.document_id,
    d.filename,
    c.page_number,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.chunks c
  join public.documents d on d.id = c.document_id
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- The application calls this RPC using the server-only Supabase client
-- authenticated with SUPABASE_SECRET_KEY (service_role) — see
-- lib/supabase/server.ts and lib/retrieval/search.ts. service_role is
-- granted here as the minimum required for the app to work; anon/
-- authenticated are included too, following the standard Supabase
-- convention for RPCs meant to be reachable from client-side code (this
-- app doesn't currently call it that way, but the live grant may include
-- them — see the introspection query above to confirm).
grant execute on function public.match_chunks(extensions.vector, integer)
  to anon, authenticated, service_role;

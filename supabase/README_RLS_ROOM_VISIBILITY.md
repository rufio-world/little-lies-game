# RLS: game_rooms visibility migration

This repository added a migration `20251112_fix_rls_room_visibility.sql` which:

- Creates a SECURITY DEFINER function `public.get_room_by_code(p_code text)` that returns
  only `id`, `code`, and `game_state` for a room matching the given code (uppercased).
- Enables Row Level Security (RLS) on `public.game_rooms`.
- Revokes `SELECT` from `public` on `game_rooms` so anonymous direct selects are blocked.

Why this was added
------------------
Previously the client could directly SELECT `game_rooms` rows by code, which exposed
room rows to anyone who could call the table (DevTools -> supabase.from('game_rooms').select('*')).
We now restrict direct selects and provide a secure RPC for join-by-code.

How the client should join a room now
------------------------------------
- The frontend calls the RPC `get_room_by_code(code)` to resolve the room ID and state.
- The RPC is security definer, so it can be called by the anonymous client without exposing the entire table.
- After resolving the room ID and checking `game_state`, the client proceeds to insert into `players`.

Deployment steps
----------------
1. Apply the migration to your Supabase database (via `supabase` CLI or SQL execution in the dashboard).
2. Verify the function exists:

   SELECT * FROM public.get_room_by_code('ABC12');

   This should return a single row with `id`, `code`, `game_state` when the code exists.

3. Run an integration test: from the frontend join flow, verify that joining by code still works.

4. Optional: Add additional RLS `SELECT` policies for `game_rooms` to allow reading rows for
   authenticated participants or server-side roles as needed. Our migration intentionally
   leaves those policies to be defined to match your authentication mapping.

Notes & Rollback
----------------
- If you need to rollback, drop the function and disable RLS / restore grants. Example rollback:

  DROP FUNCTION IF EXISTS public.get_room_by_code(text);
  ALTER TABLE public.game_rooms DISABLE ROW LEVEL SECURITY;
  GRANT SELECT ON public.game_rooms TO public;

- Adding restrictive RLS policies may break server-side code that expects to `SELECT` directly.
  Add policies carefully and test server flows.

Contact
-------
If you want, I can also add an automated SQL migration that creates safe policies to allow
authenticated participants to SELECT their own room rows (needs mapping between auth UID and players.id).

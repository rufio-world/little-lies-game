-- Migration: ensure get_room_by_code RPC exists for joining games
-- Date: 2025-11-13

BEGIN;

CREATE OR REPLACE FUNCTION public.get_room_by_code(p_code text)
RETURNS TABLE(id uuid, code text, game_state text) AS $$
BEGIN
  RETURN QUERY
  SELECT id, code, game_state
  FROM public.game_rooms
  WHERE code = upper(trim(p_code))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

ALTER FUNCTION public.get_room_by_code(text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_room_by_code(text) TO anon, authenticated;

COMMIT;

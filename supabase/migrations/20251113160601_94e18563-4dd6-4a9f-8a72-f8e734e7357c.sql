-- Fix ambiguous column reference in get_room_by_code function
CREATE OR REPLACE FUNCTION public.get_room_by_code(p_code text)
RETURNS TABLE(id uuid, code text, game_state text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    game_rooms.id, 
    game_rooms.code, 
    game_rooms.game_state
  FROM public.game_rooms
  WHERE game_rooms.code = upper(p_code)
  LIMIT 1;
END;
$$;
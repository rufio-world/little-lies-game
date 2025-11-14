-- Create function to check if all players are ready for next round
CREATE OR REPLACE FUNCTION public.are_all_players_ready(
  p_round_id UUID,
  p_room_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_active_player_count INTEGER;
  v_ready_count INTEGER;
BEGIN
  -- Count active players in the room (excluding disconnected players)
  SELECT COUNT(*)
  INTO v_active_player_count
  FROM players
  WHERE room_id = p_room_id
    AND connected = true;
  
  -- Count players marked as ready for this round
  SELECT COUNT(DISTINCT player_id)
  INTO v_ready_count
  FROM round_readiness
  WHERE round_id = p_round_id
    AND is_ready = true;
  
  -- Return true if all active players are ready
  RETURN v_ready_count >= v_active_player_count AND v_active_player_count > 0;
END;
$$;
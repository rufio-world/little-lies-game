-- Fix search_path for are_all_answers_submitted function
CREATE OR REPLACE FUNCTION public.are_all_answers_submitted(
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
  v_answer_count INTEGER;
BEGIN
  -- Count active players in the room (excluding disconnected players)
  SELECT COUNT(*)
  INTO v_active_player_count
  FROM players
  WHERE room_id = p_room_id
    AND connected = true;
  
  -- Count answers submitted for this round
  SELECT COUNT(DISTINCT player_id)
  INTO v_answer_count
  FROM player_answers
  WHERE round_id = p_round_id;
  
  -- Return true if all active players have submitted answers
  RETURN v_answer_count >= v_active_player_count AND v_active_player_count > 0;
END;
$$;

-- Fix search_path for are_all_votes_submitted function
CREATE OR REPLACE FUNCTION public.are_all_votes_submitted(
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
  v_vote_count INTEGER;
BEGIN
  -- Count active players in the room (excluding disconnected players)
  SELECT COUNT(*)
  INTO v_active_player_count
  FROM players
  WHERE room_id = p_room_id
    AND connected = true;
  
  -- Count votes submitted for this round
  SELECT COUNT(DISTINCT player_id)
  INTO v_vote_count
  FROM player_votes
  WHERE round_id = p_round_id;
  
  -- Return true if all active players have voted
  RETURN v_vote_count >= v_active_player_count AND v_active_player_count > 0;
END;
$$;
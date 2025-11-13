-- Migration: update inactivity handling to 2-minute window
-- Date: 2025-11-13

BEGIN;

CREATE OR REPLACE FUNCTION public.are_all_answers_submitted(p_round_id uuid, p_room_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requester uuid;
  active_players integer;
  submitted_answers integer;
BEGIN
  requester := auth.uid();
  IF requester IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOT public.is_room_participant(p_room_id, requester) THEN
    RETURN FALSE;
  END IF;

  SELECT count(*) INTO active_players
  FROM public.players
  WHERE room_id = p_room_id
    AND (
      connected IS TRUE
      OR (last_active_at IS NOT NULL AND last_active_at >= now() - interval '2 minutes')
    );

  SELECT count(*) INTO submitted_answers
  FROM public.player_answers
  WHERE round_id = p_round_id;

  IF active_players = 0 THEN
    RETURN FALSE;
  END IF;

  RETURN submitted_answers >= active_players;
END;
$$;

CREATE OR REPLACE FUNCTION public.are_all_votes_submitted(p_round_id uuid, p_room_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requester uuid;
  active_players integer;
  submitted_votes integer;
BEGIN
  requester := auth.uid();
  IF requester IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOT public.is_room_participant(p_room_id, requester) THEN
    RETURN FALSE;
  END IF;

  SELECT count(*) INTO active_players
  FROM public.players
  WHERE room_id = p_room_id
    AND (
      connected IS TRUE
      OR (last_active_at IS NOT NULL AND last_active_at >= now() - interval '2 minutes')
    );

  SELECT count(*) INTO submitted_votes
  FROM public.player_votes
  WHERE round_id = p_round_id;

  IF active_players = 0 THEN
    RETURN FALSE;
  END IF;

  RETURN submitted_votes >= active_players;
END;
$$;

CREATE OR REPLACE FUNCTION public.are_all_players_ready(p_round_id uuid, p_room_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  requester uuid;
  active_players integer;
  ready_players integer;
BEGIN
  requester := auth.uid();
  IF requester IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOT public.is_room_participant(p_room_id, requester) THEN
    RETURN FALSE;
  END IF;

  SELECT count(*) INTO active_players
  FROM public.players
  WHERE room_id = p_room_id
    AND (
      connected IS TRUE
      OR (last_active_at IS NOT NULL AND last_active_at >= now() - interval '2 minutes')
    );

  SELECT count(*) INTO ready_players
  FROM public.round_readiness
  WHERE round_id = p_round_id
    AND is_ready IS TRUE;

  IF active_players = 0 THEN
    RETURN FALSE;
  END IF;

  RETURN ready_players >= active_players;
END;
$$;

COMMIT;

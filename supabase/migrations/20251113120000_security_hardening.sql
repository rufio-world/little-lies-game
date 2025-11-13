-- Security hardening: tighten RLS and add helper functions/views
-- Date: 2025-11-13

BEGIN;

-- Drop legacy or placeholder policies so we can recreate secure versions
DROP POLICY IF EXISTS "Anyone can view game rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Anyone can create game rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Anyone can update game rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Host can update game rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Host can delete game rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Room participants can view game rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Only room participants can view game rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Host can update their game room" ON public.game_rooms;
DROP POLICY IF EXISTS "Host can delete their game room" ON public.game_rooms;

DROP POLICY IF EXISTS "Anyone can view players" ON public.players;
DROP POLICY IF EXISTS "Anyone can create players" ON public.players;
DROP POLICY IF EXISTS "Anyone can update players" ON public.players;
DROP POLICY IF EXISTS "Anyone can delete players" ON public.players;
DROP POLICY IF EXISTS "Players can view all players" ON public.players;
DROP POLICY IF EXISTS "Room participants can view players in same room" ON public.players;
DROP POLICY IF EXISTS "Players can only view same-room participants" ON public.players;
DROP POLICY IF EXISTS "Players can join a game room" ON public.players;
DROP POLICY IF EXISTS "Host can update players or players can update themselves" ON public.players;
DROP POLICY IF EXISTS "Host can delete players" ON public.players;
DROP POLICY IF EXISTS "Players can update themselves; hosts can update room members" ON public.players;
DROP POLICY IF EXISTS "Players can leave; hosts can kick players" ON public.players;

DROP POLICY IF EXISTS "Room participants can view game rounds" ON public.game_rounds;
DROP POLICY IF EXISTS "Host can create game rounds" ON public.game_rounds;
DROP POLICY IF EXISTS "Host can update game rounds" ON public.game_rounds;

DROP POLICY IF EXISTS "Room participants can view all answers after voting starts" ON public.player_answers;
DROP POLICY IF EXISTS "Players can view their own answers anytime" ON public.player_answers;
DROP POLICY IF EXISTS "Players can submit their own answers" ON public.player_answers;

DROP POLICY IF EXISTS "Room participants can view votes after results" ON public.player_votes;
DROP POLICY IF EXISTS "Players can view their own votes anytime" ON public.player_votes;
DROP POLICY IF EXISTS "Players can submit their own votes" ON public.player_votes;

DROP POLICY IF EXISTS "Room participants can view round readiness" ON public.round_readiness;
DROP POLICY IF EXISTS "Players can mark themselves ready" ON public.round_readiness;
DROP POLICY IF EXISTS "Players can update their own readiness" ON public.round_readiness;

-- Ensure we always provide a sanitized view for gameplay data
DROP VIEW IF EXISTS public.game_rounds_safe;
CREATE VIEW public.game_rounds_safe AS
SELECT
  id,
  room_id,
  round_number,
  question_id,
  question_text,
  CASE
    WHEN phase = 'results' THEN correct_answer
    ELSE NULL
  END AS correct_answer,
  phase,
  created_at,
  updated_at
FROM public.game_rounds;

GRANT SELECT ON public.game_rounds_safe TO anon, authenticated;

-- game_rooms policies
CREATE POLICY "room_select_participants_only"
ON public.game_rooms
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    game_rooms.host_id = auth.uid()
    OR public.is_room_participant(game_rooms.id, auth.uid())
  )
);

CREATE POLICY "room_create_authenticated_hosts"
ON public.game_rooms
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND host_id = auth.uid()
);

CREATE POLICY "room_update_host_only"
ON public.game_rooms
FOR UPDATE
USING (auth.uid() = host_id)
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "room_delete_host_only"
ON public.game_rooms
FOR DELETE
USING (auth.uid() = host_id);

-- players policies
CREATE POLICY "players_view_room_members"
ON public.players
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    players.id = auth.uid()
    OR public.is_room_participant(players.room_id, auth.uid())
  )
);

CREATE POLICY "players_insert_self_only"
ON public.players
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND id = auth.uid()
  AND (
    is_host IS NOT TRUE
    OR EXISTS (
      SELECT 1 FROM public.game_rooms gr
      WHERE gr.id = room_id
      AND gr.host_id = auth.uid()
    )
  )
);

CREATE POLICY "players_update_self_or_host"
ON public.players
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND (
    players.id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.game_rooms gr
      WHERE gr.id = players.room_id
        AND gr.host_id = auth.uid()
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    players.id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.game_rooms gr
      WHERE gr.id = players.room_id
        AND gr.host_id = auth.uid()
    )
  )
);

CREATE POLICY "players_delete_self_or_host"
ON public.players
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    players.id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.game_rooms gr
      WHERE gr.id = players.room_id
        AND gr.host_id = auth.uid()
    )
  )
);

-- game_rounds policies
CREATE POLICY "rounds_view_participants"
ON public.game_rounds
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND public.is_room_participant(game_rounds.room_id, auth.uid())
);

CREATE POLICY "rounds_insert_host_only"
ON public.game_rounds
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = room_id
      AND gr.host_id = auth.uid()
  )
);

CREATE POLICY "rounds_update_host_only"
ON public.game_rounds
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = room_id
      AND gr.host_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.game_rooms gr
    WHERE gr.id = room_id
      AND gr.host_id = auth.uid()
  )
);

-- player_answers policies
CREATE POLICY "answers_view_limited"
ON public.player_answers
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    player_answers.player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.game_rounds gr
      WHERE gr.id = player_answers.round_id
        AND gr.phase IN ('voting', 'results')
        AND public.is_room_participant(gr.room_id, auth.uid())
    )
  )
);

CREATE POLICY "answers_insert_self_only"
ON public.player_answers
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND player_answers.player_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.game_rounds gr
    WHERE gr.id = player_answers.round_id
      AND gr.phase = 'answer-submission'
      AND public.is_room_participant(gr.room_id, auth.uid())
  )
);

-- player_votes policies
CREATE POLICY "votes_view_limited"
ON public.player_votes
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    player_votes.player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.game_rounds gr
      WHERE gr.id = player_votes.round_id
        AND gr.phase = 'results'
        AND public.is_room_participant(gr.room_id, auth.uid())
    )
  )
);

CREATE POLICY "votes_insert_self_only"
ON public.player_votes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND player_votes.player_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.game_rounds gr
    WHERE gr.id = player_votes.round_id
      AND gr.phase = 'voting'
      AND public.is_room_participant(gr.room_id, auth.uid())
  )
);

-- round_readiness policies
CREATE POLICY "readiness_view_participants"
ON public.round_readiness
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.game_rounds gr
    WHERE gr.id = round_readiness.round_id
      AND public.is_room_participant(gr.room_id, auth.uid())
  )
);

CREATE POLICY "readiness_insert_self_only"
ON public.round_readiness
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND round_readiness.player_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.game_rounds gr
    WHERE gr.id = round_readiness.round_id
      AND gr.phase = 'results'
      AND public.is_room_participant(gr.room_id, auth.uid())
  )
);

CREATE POLICY "readiness_update_self_only"
ON public.round_readiness
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND round_readiness.player_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND round_readiness.player_id = auth.uid()
);

-- Helper functions to share aggregate readiness/submission signals without exposing raw data
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
      OR (last_active_at IS NOT NULL AND last_active_at >= now() - interval '1 minute')
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
      OR (last_active_at IS NOT NULL AND last_active_at >= now() - interval '1 minute')
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
      OR (last_active_at IS NOT NULL AND last_active_at >= now() - interval '1 minute')
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

GRANT EXECUTE ON FUNCTION public.are_all_answers_submitted(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.are_all_votes_submitted(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.are_all_players_ready(uuid, uuid) TO anon, authenticated;

COMMIT;

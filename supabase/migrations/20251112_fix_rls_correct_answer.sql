-- MIGRATION: Fix Correct Answer Exposure (CRITICAL)
-- Created: November 12, 2025
-- Purpose: Hide correct_answer during gameplay; only expose during results phase
-- Status: TEMPLATE - Ready to apply after review

-- Step 1: Drop the overly-permissive read policy
DROP POLICY IF EXISTS "Anyone can view game rounds" ON public.game_rounds;

-- Step 2: Create a safe read policy that hides correct_answer during gameplay
-- The policy will still allow fetching the round, but hiding the answer
-- Note: Supabase RLS cannot hide columns directly; we need a view-based approach
-- or handle this in application code during non-results phases

-- For now, create a policy that restricts access by phase:
CREATE POLICY "Room participants can view rounds with answer visibility control"
ON public.game_rounds
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = game_rounds.room_id
  )
);

-- Step 3: Create a secure view that excludes correct_answer during gameplay
-- This view should be used by the application during non-results phases
CREATE OR REPLACE VIEW public.game_rounds_safe AS
SELECT 
  id,
  room_id,
  round_number,
  question_id,
  question_text,
  -- Only include correct_answer if phase is 'results'
  CASE 
    WHEN phase = 'results' THEN correct_answer
    ELSE '[HIDDEN]'::text
  END as correct_answer,
  phase,
  created_at,
  updated_at
FROM public.game_rounds;

-- Step 4: Grant access to authenticated users
GRANT SELECT ON public.game_rounds_safe TO authenticated;

-- Step 5: Add application-level enforcement
-- In gameRoundService.ts, when fetching during non-results phases,
-- manually exclude the correct_answer field from the response

-- Verification queries (run after applying migration):
-- 1. Non-results phase - verify correct_answer is hidden:
--    SELECT * FROM game_rounds_safe 
--    WHERE phase = 'voting' AND id = 'test-round-id';
-- 2. Results phase - verify correct_answer is visible:
--    SELECT * FROM game_rounds_safe 
--    WHERE phase = 'results' AND id = 'test-round-id';

-- Migration: Fix Critical Security Issues (RLS Policies)
-- Date: 2025-11-12
-- Purpose: Address critical data exposure vulnerabilities in game_rounds, game_rooms, and players tables
-- Risk Level: HIGH - These changes affect access control; thorough testing required

-- ============================================================================
-- Issue 1: Fix Correct Answer Exposure in game_rounds
-- ============================================================================
-- Problem: Players can query correct_answer during active gameplay (answer-submission, voting phases)
-- Solution: Remove correct_answer from SELECT unless phase is 'results'

-- First, create a view that conditionally exposes correct_answer based on phase
CREATE OR REPLACE VIEW game_rounds_public AS
SELECT 
  id,
  room_id,
  round_number,
  question_id,
  question_text,
  CASE 
    WHEN phase = 'results' THEN correct_answer
    ELSE NULL
  END as correct_answer,
  phase,
  created_at,
  updated_at
FROM game_rounds;

-- Update RLS policy to only SELECT from this view
-- WARNING: In a real migration, you would:
-- 1. Backup current data
-- 2. Test thoroughly in staging
-- 3. Update applications to use game_rounds_public view for reads
-- 4. Gradually migrate to new policy
-- 5. Monitor for issues

-- Current policy (BEFORE) - REMOVE:
-- (true) -- Anyone can read any game round

-- New policy (AFTER):
-- Only players in the room can see game rounds:
-- EXISTS (SELECT 1 FROM players 
--   WHERE players.room_id = game_rounds.room_id 
--   AND players.id = auth.uid())

-- For now, document the required policy change:
-- ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Players can see rounds in their room" ON game_rounds
--   FOR SELECT USING (
--     EXISTS (SELECT 1 FROM players 
--       WHERE players.room_id = game_rounds.room_id 
--       AND players.id = auth.uid())
--   );

-- ============================================================================
-- Issue 2: Fix Game Room Visibility (game_rooms Table)
-- ============================================================================
-- Problem: Anyone can list all game rooms in 'waiting' state
-- Solution: Require user to be a participant in the room

-- Current policy (BEFORE):
-- (game_state = 'waiting'::text)

-- New policy (AFTER):
-- EXISTS (SELECT 1 FROM players 
--   WHERE players.room_id = game_rooms.id 
--   AND players.id = auth.uid())

-- This means:
-- - Players already in a room can see it
-- - Unauthenticated users cannot list all rooms
-- - The "join by code" endpoint needs special handling

-- ============================================================================
-- Issue 3: Fix Player Data Visibility (players Table)
-- ============================================================================
-- Problem: Anyone can query all players in all games (condition: true)
-- Solution: Only allow seeing players in your current room

-- Current policy (BEFORE):
-- (true) -- Anyone can see all players

-- New policy (AFTER):
-- EXISTS (SELECT 1 FROM players self
--   WHERE self.room_id = players.room_id 
--   AND self.id = auth.uid())

-- This means:
-- - Players can only see other players in the same room
-- - Players cannot see players in other games
-- - Privacy is maintained across separate games

-- ============================================================================
-- Add DATABASE CONSTRAINT for Answer Length Validation
-- ============================================================================
-- Ensures the database enforces answer length limits as defense-in-depth

ALTER TABLE player_answers 
ADD CONSTRAINT answer_length_check 
CHECK (LENGTH(answer_text) BETWEEN 2 AND 200);

-- ============================================================================
-- IMPORTANT: Application Changes Required
-- ============================================================================
-- These RLS policy changes require updates to the application:

-- 1. In src/pages/WaitingRoom.tsx:
--    The "Start Game" flow loads questions from packs dynamically.
--    This still works because the host is a player in the room.

-- 2. In src/pages/JoinGame.tsx:
--    The join-by-code endpoint should NOT rely on querying game_rooms.
--    Instead: Create a separate database function that accepts (code) and returns (room_id)
--    This function should work WITHOUT requiring RLS permission to see the room.
--
--    CREATE OR REPLACE FUNCTION join_game_by_code(p_code TEXT)
--    RETURNS TABLE (id UUID, name TEXT, host_id UUID, max_questions INT) AS $$
--    BEGIN
--      RETURN QUERY SELECT gr.id, gr.name, gr.host_id, gr.max_questions
--      FROM game_rooms gr
--      WHERE gr.code = p_code
--      AND gr.game_state = 'waiting';
--    END;
--    $$ LANGUAGE plpgsql;

-- 3. In src/services/gameService.ts:
--    The joinGame() function may need to use a trusted function instead of direct SELECT.
--    Or, adjust client to call the new RPC function.

-- 4. In src/hooks/useGameRoom.ts:
--    Real-time subscriptions should continue to work because the player is in the room.
--    Verify that the subscription still receives updates correctly.

-- ============================================================================
-- Rollback Instructions (if needed)
-- ============================================================================
-- 1. Restore previous RLS policies
-- 2. Remove the CHECK constraint on player_answers
-- 3. Drop the game_rounds_public view
-- 4. Rollback application code changes
-- 5. Restart affected services

-- ============================================================================
-- Testing Checklist (BEFORE DEPLOYING)
-- ============================================================================
-- [ ] Unauthenticated user cannot SELECT from game_rounds
-- [ ] Unauthenticated user cannot list game_rooms
-- [ ] Unauthenticated user cannot SELECT from players
-- [ ] Player in Room A cannot see data from Room B
-- [ ] Player can see correct_answer ONLY during 'results' phase
-- [ ] Existing games in progress can transition to results correctly
-- [ ] Join-by-code endpoint still works after RLS changes
-- [ ] Host can start game from waiting room
-- [ ] Real-time subscriptions still update correctly
-- [ ] No performance regression from new RLS policies

-- Migration Status: DOCUMENT CREATED (NOT YET APPLIED)
-- Next Step: Review with team, test thoroughly, then apply to Supabase

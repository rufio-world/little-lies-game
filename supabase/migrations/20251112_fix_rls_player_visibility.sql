-- MIGRATION: Fix Player Data Exposure (HIGH)
-- Created: November 12, 2025
-- Purpose: Scope player visibility to same-room participants only
-- Status: TEMPLATE - Ready to apply after review

-- Step 1: Drop the overly-permissive policy that exposes all players
DROP POLICY IF EXISTS "Players can view all players" ON public.players;
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;

-- Step 2: Create a restrictive policy - only see players in your room
-- A player can only view other players if they share the same room_id
CREATE POLICY "Players can only view same-room participants"
ON public.players
FOR SELECT
USING (
  -- The viewing player must be in the same room as the player being viewed
  room_id IN (
    SELECT room_id FROM public.players WHERE id = auth.uid()
  )
  OR
  -- Exception: Players can always see their own record
  id = auth.uid()
);

-- Step 3: Allow players to insert themselves (join a room)
CREATE POLICY "Players can join a game room"
ON public.players
FOR INSERT
WITH CHECK (true);

-- Step 4: Players can update their own record or hosts can update any player in their room
CREATE POLICY "Players can update themselves; hosts can update room members"
ON public.players
FOR UPDATE
USING (
  -- Can update own record
  id = auth.uid()
  OR
  -- Host can update players in their room
  EXISTS (
    SELECT 1 FROM public.players host
    WHERE host.id = auth.uid()
    AND host.is_host = true
    AND host.room_id = players.room_id
  )
);

-- Step 5: Host can delete players from their room; players can delete themselves
CREATE POLICY "Players can leave; hosts can kick players"
ON public.players
FOR DELETE
USING (
  -- Can delete own record
  id = auth.uid()
  OR
  -- Host can delete players from their room
  EXISTS (
    SELECT 1 FROM public.players host
    WHERE host.id = auth.uid()
    AND host.is_host = true
    AND host.room_id = players.room_id
  )
);

-- Verification queries (run after applying migration):
-- 1. Non-room member trying to list players - should return empty:
--    SELECT * FROM players WHERE room_id = 'other-room-id';
-- 2. Room participant listing players - should see all room members:
--    SELECT * FROM players WHERE room_id IN (
--      SELECT room_id FROM players WHERE id = auth.uid()
--    );
-- 3. Player can always see their own record:
--    SELECT * FROM players WHERE id = auth.uid();

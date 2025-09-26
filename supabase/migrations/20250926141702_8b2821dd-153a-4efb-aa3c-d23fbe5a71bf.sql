-- Fix RLS policy for game room creation
-- Drop and recreate the INSERT policy to ensure it works correctly

DROP POLICY IF EXISTS "Anyone can create game rooms" ON public.game_rooms;

-- Create a simple INSERT policy that allows anyone to create rooms
CREATE POLICY "Anyone can create game rooms"
ON public.game_rooms
FOR INSERT
WITH CHECK (true);

-- Also ensure the SELECT policy works for room participants
DROP POLICY IF EXISTS "Room participants can view game rooms" ON public.game_rooms;

CREATE POLICY "Room participants can view game rooms"
ON public.game_rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = game_rooms.id
  )
  OR
  -- Allow viewing rooms during creation process
  game_state = 'waiting'
);
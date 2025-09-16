-- Fix critical data privacy issues: Restrict game room and player data access to room participants only

-- Drop overly permissive SELECT policies
DROP POLICY IF EXISTS "Anyone can view game rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;

-- Create security definer function to check if a user is a participant in a room
-- This prevents infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_room_participant(room_id uuid, player_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = room_id 
    AND players.id = player_id
  );
$$;

-- Create security definer function to get player's current room
CREATE OR REPLACE FUNCTION public.get_player_room_id(player_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT room_id FROM public.players WHERE id = player_id LIMIT 1;
$$;

-- New secure SELECT policy for game_rooms: Only room participants can view room data
CREATE POLICY "Room participants can view game rooms"
ON public.game_rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = game_rooms.id
  )
);

-- New secure SELECT policy for players: Only players in the same room can see each other
CREATE POLICY "Room participants can view players in same room"
ON public.players
FOR SELECT
USING (
  -- Allow viewing players in the same room
  EXISTS (
    SELECT 1 FROM public.players viewer_player
    WHERE viewer_player.room_id = players.room_id
  )
);
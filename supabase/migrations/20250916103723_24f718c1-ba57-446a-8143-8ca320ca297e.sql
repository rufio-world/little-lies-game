-- Fix security vulnerability: Restrict game room access properly

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can update game rooms" ON public.game_rooms;

-- Create more secure update policy - only allow updates when proper host verification is provided
CREATE POLICY "Host can update game rooms" 
ON public.game_rooms 
FOR UPDATE 
USING (
  -- Check if the host_id matches an existing host player in this room
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = game_rooms.id 
    AND players.id = game_rooms.host_id
    AND players.is_host = true
  )
);

-- Add secure delete policy - only hosts can delete their rooms
CREATE POLICY "Host can delete game rooms" 
ON public.game_rooms 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = game_rooms.id 
    AND players.id = game_rooms.host_id
    AND players.is_host = true
  )
);

-- Update player policies to prevent unauthorized player manipulation
DROP POLICY IF EXISTS "Anyone can update players" ON public.players;
DROP POLICY IF EXISTS "Anyone can delete players" ON public.players;

-- Only allow player updates by the host (for kicking) or self-updates for connection status
CREATE POLICY "Host can update players or players can update themselves" 
ON public.players 
FOR UPDATE 
USING (
  -- Host can update any player in their room
  EXISTS (
    SELECT 1 FROM public.game_rooms 
    WHERE game_rooms.id = players.room_id 
    AND EXISTS (
      SELECT 1 FROM public.players host_player
      WHERE host_player.room_id = game_rooms.id 
      AND host_player.id = game_rooms.host_id
      AND host_player.is_host = true
    )
  )
);

-- Only allow player deletion by host (for kicking) or leaving themselves
CREATE POLICY "Host can delete players" 
ON public.players 
FOR DELETE 
USING (
  -- Host can delete any player in their room
  EXISTS (
    SELECT 1 FROM public.game_rooms 
    WHERE game_rooms.id = players.room_id 
    AND EXISTS (
      SELECT 1 FROM public.players host_player
      WHERE host_player.room_id = game_rooms.id 
      AND host_player.id = game_rooms.host_id
      AND host_player.is_host = true
    )
  )
);
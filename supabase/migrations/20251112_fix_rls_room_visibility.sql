-- Migration: Restrict direct SELECT on game_rooms and provide secure join-by-code RPC
-- Date: 2025-11-12

-- NOTE: This migration enables Row Level Security (RLS) for the `game_rooms` table
-- and creates a SECURITY DEFINER function `get_room_by_code(code text)` which
-- returns only minimal fields required to complete a join-by-code flow.
--
-- The function is SECURITY DEFINER so it can be called by anonymous/unauthenticated
-- clients (the frontend) without exposing the full table via direct SELECTs.

BEGIN;

-- Create the RPC used by the client to lookup a room by its code.
CREATE OR REPLACE FUNCTION public.get_room_by_code(p_code text)
RETURNS TABLE(id uuid, code text, game_state text) AS $$
BEGIN
  RETURN QUERY
  SELECT id, code, game_state
  FROM public.game_rooms
  WHERE code = upper(p_code)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure function owner is the database owner (so it can bypass RLS in a controlled way).
ALTER FUNCTION public.get_room_by_code(text) OWNER TO postgres;

-- Enable RLS on game_rooms so that direct SELECTs are constrained.
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- Revoke public SELECT to prevent anonymous direct selects. The RPC above is the supported way
-- for the client to resolve a room code to an ID. RLS policies can be added later to allow
-- authenticated players (server-to-server flows) as required.
REVOKE SELECT ON public.game_rooms FROM public;

COMMIT;

-- IMPORTANT: This migration intentionally does not add complex SELECT policies that depend on
-- application-specific authentication mapping to players. Instead, it provides a secure RPC
-- for join-by-code and enables RLS as a baseline. After deploying, consider adding policies
-- that allow authenticated players (or service roles) to read room rows for participants only.
-- MIGRATION: Fix Room Code/Data Visibility (HIGH)
-- Created: November 12, 2025
-- Purpose: Restrict game_rooms access to participants only; remove game_state=waiting exposure
-- Status: TEMPLATE - Ready to apply after review

-- Step 1: Drop the overly-permissive policy that exposes waiting rooms
DROP POLICY IF EXISTS "Room participants can view game rooms" ON public.game_rooms;

-- Step 2: Create a strict policy - only room participants can view
-- This requires the viewing user to be listed as a player in the room
CREATE POLICY "Only room participants can view game rooms"
ON public.game_rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = game_rooms.id 
    AND players.id = auth.uid()
  )
);

-- Step 3: Allow anyone to INSERT (create rooms) - this is needed for game creation
CREATE POLICY "Anyone can create game rooms"
ON public.game_rooms
FOR INSERT
WITH CHECK (true);

-- Step 4: Host can update their own room
CREATE POLICY "Host can update their game room"
ON public.game_rooms
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = game_rooms.id 
    AND players.id = auth.uid()
    AND players.is_host = true
  )
);

-- Step 5: Host can delete their room
CREATE POLICY "Host can delete their game room"
ON public.game_rooms
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = game_rooms.id 
    AND players.id = auth.uid()
    AND players.is_host = true
  )
);

-- IMPORTANT: Application-Level Changes Required
-- This migration requires changes to the CreateGame flow:
-- 1. After creating room, immediately insert the host as a player
-- 2. For join-by-code: Create a separate, rate-limited function/endpoint
--    that accepts a code and validates it WITHOUT using RLS
-- 3. Function should return: { success: bool, roomId: string, error?: string }
-- 4. Only return roomId if code is valid; let application handle subsequent RLS check

-- Verification queries (run after applying migration):
-- 1. Non-participant trying to view room - should return empty:
--    SELECT * FROM game_rooms WHERE code = 'TESTCODE';
-- 2. Participant viewing room - should return room data:
--    SELECT * FROM game_rooms 
--    WHERE id IN (SELECT room_id FROM players WHERE id = auth.uid());

-- Add unique constraint to prevent duplicate readiness records per player per round
ALTER TABLE public.round_readiness 
ADD CONSTRAINT round_readiness_round_player_unique UNIQUE (round_id, player_id);
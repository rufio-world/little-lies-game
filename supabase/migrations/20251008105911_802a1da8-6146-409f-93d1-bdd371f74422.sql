-- Add last_active_at column to track player activity
ALTER TABLE public.players 
ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for efficient querying
CREATE INDEX idx_players_last_active ON public.players(last_active_at);

-- Update existing players to have current timestamp
UPDATE public.players SET last_active_at = now() WHERE last_active_at IS NULL;
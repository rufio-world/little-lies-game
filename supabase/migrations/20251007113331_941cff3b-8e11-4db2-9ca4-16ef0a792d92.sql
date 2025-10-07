-- Create table to track player readiness for next round
CREATE TABLE public.round_readiness (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL,
  player_id UUID NOT NULL,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  marked_ready_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(round_id, player_id)
);

-- Enable Row Level Security
ALTER TABLE public.round_readiness ENABLE ROW LEVEL SECURITY;

-- Players can view readiness status for their round
CREATE POLICY "Room participants can view round readiness"
ON public.round_readiness
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM game_rounds gr
    JOIN players p ON p.room_id = gr.room_id
    WHERE gr.id = round_readiness.round_id
  )
);

-- Players can mark themselves ready
CREATE POLICY "Players can mark themselves ready"
ON public.round_readiness
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM players p
    JOIN game_rounds gr ON gr.room_id = p.room_id
    WHERE p.id = round_readiness.player_id
    AND gr.id = round_readiness.round_id
    AND gr.phase = 'results'
  )
);

-- Players can update their own readiness
CREATE POLICY "Players can update their own readiness"
ON public.round_readiness
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM players p
    WHERE p.id = round_readiness.player_id
  )
);

-- Create index for faster queries
CREATE INDEX idx_round_readiness_round ON public.round_readiness(round_id);
CREATE INDEX idx_round_readiness_player ON public.round_readiness(player_id);
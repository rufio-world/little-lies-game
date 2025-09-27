-- Create tables for the game mechanic

-- Game rounds table to track each round's question and state
CREATE TABLE public.game_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'answer-submission' CHECK (phase IN ('answer-submission', 'voting', 'results')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, round_number)
);

-- Player answers for each round
CREATE TABLE public.player_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.game_rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(round_id, player_id)
);

-- Player votes for each round
CREATE TABLE public.player_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.game_rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  voted_for_answer_id UUID REFERENCES public.player_answers(id) ON DELETE CASCADE,
  voted_for_correct BOOLEAN DEFAULT FALSE, -- if they voted for the correct answer
  voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(round_id, player_id)
);

-- Enable RLS on new tables
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_rounds
CREATE POLICY "Room participants can view game rounds"
ON public.game_rounds FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.players 
  WHERE players.room_id = game_rounds.room_id
));

CREATE POLICY "Host can create game rounds"
ON public.game_rounds FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.game_rooms gr
  JOIN public.players p ON p.room_id = gr.id AND p.id = gr.host_id AND p.is_host = true
  WHERE gr.id = room_id
));

CREATE POLICY "Host can update game rounds"
ON public.game_rounds FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.game_rooms gr
  JOIN public.players p ON p.room_id = gr.id AND p.id = gr.host_id AND p.is_host = true
  WHERE gr.id = room_id
));

-- RLS Policies for player_answers
CREATE POLICY "Room participants can view all answers after voting starts"
ON public.player_answers FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.game_rounds gr
  JOIN public.players p ON p.room_id = gr.room_id
  WHERE gr.id = round_id AND gr.phase IN ('voting', 'results')
));

CREATE POLICY "Players can view their own answers anytime"
ON public.player_answers FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.players p
  WHERE p.id = player_id
));

CREATE POLICY "Players can submit their own answers"
ON public.player_answers FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.players p
  JOIN public.game_rounds gr ON gr.room_id = p.room_id
  WHERE p.id = player_id AND gr.id = round_id AND gr.phase = 'answer-submission'
));

-- RLS Policies for player_votes
CREATE POLICY "Room participants can view votes after results"
ON public.player_votes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.game_rounds gr
  JOIN public.players p ON p.room_id = gr.room_id
  WHERE gr.id = round_id AND gr.phase = 'results'
));

CREATE POLICY "Players can view their own votes anytime"
ON public.player_votes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.players p
  WHERE p.id = player_id
));

CREATE POLICY "Players can submit their own votes"
ON public.player_votes FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.players p
  JOIN public.game_rounds gr ON gr.room_id = p.room_id
  WHERE p.id = player_id AND gr.id = round_id AND gr.phase = 'voting'
));

-- Enable realtime for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_votes;

-- Set replica identity for realtime updates
ALTER TABLE public.game_rounds REPLICA IDENTITY FULL;
ALTER TABLE public.player_answers REPLICA IDENTITY FULL;
ALTER TABLE public.player_votes REPLICA IDENTITY FULL;

-- Add updated_at trigger for game_rounds
CREATE TRIGGER update_game_rounds_updated_at
  BEFORE UPDATE ON public.game_rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
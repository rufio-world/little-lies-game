-- Create game_rooms table
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  host_id UUID NOT NULL,
  selected_packs TEXT[] DEFAULT '{}',
  max_questions INTEGER DEFAULT 5,
  current_question_index INTEGER DEFAULT 0,
  game_state TEXT DEFAULT 'waiting' CHECK (game_state IN ('waiting', 'question-display', 'answer-submission', 'voting', 'results', 'game-end')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  is_host BOOLEAN DEFAULT false,
  is_guest BOOLEAN DEFAULT false,
  connected BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Create policies for game_rooms (public read for now, we'll add auth later)
CREATE POLICY "Anyone can view game rooms" 
ON public.game_rooms 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create game rooms" 
ON public.game_rooms 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update game rooms" 
ON public.game_rooms 
FOR UPDATE 
USING (true);

-- Create policies for players (public for now)  
CREATE POLICY "Anyone can view players" 
ON public.players 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create players" 
ON public.players 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update players" 
ON public.players 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete players" 
ON public.players 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for both tables
ALTER TABLE public.game_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
-- Add language column to game_rooms table
ALTER TABLE game_rooms ADD COLUMN language text NOT NULL DEFAULT 'en';

-- Add check constraint for valid languages
ALTER TABLE game_rooms ADD CONSTRAINT valid_language CHECK (language IN ('en', 'es'));
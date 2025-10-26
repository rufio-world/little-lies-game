-- Add question_ids column to store the ordered list of question IDs for each game
ALTER TABLE game_rooms 
ADD COLUMN question_ids text[] DEFAULT '{}';

-- Add comment explaining the column
COMMENT ON COLUMN game_rooms.question_ids IS 'Ordered array of question IDs to be used in this game, set when game starts';
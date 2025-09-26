-- Force schema refresh and ensure proper configuration
-- Test the tables are accessible and trigger a schema refresh

SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('game_rooms', 'players');

-- Ensure RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('game_rooms', 'players');

-- Force a configuration reload
NOTIFY pgrst, 'reload schema';
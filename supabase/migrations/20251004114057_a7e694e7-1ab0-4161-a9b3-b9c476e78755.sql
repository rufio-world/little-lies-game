-- Update the handle_new_user function to use fun-emoji avatars instead of adventurer
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', 'Player'),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar', 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=' || NEW.id::text)
  );
  RETURN NEW;
END;
$$;
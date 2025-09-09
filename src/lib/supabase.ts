import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Some features may not work.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database types
export interface Database {
  public: {
    Tables: {
      game_rooms: {
        Row: {
          id: string;
          code: string;
          name: string;
          host_id: string;
          selected_packs: string[];
          max_questions: number;
          current_question_index: number;
          game_state: string;
          rounds: any[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          host_id: string;
          selected_packs: string[];
          max_questions: number;
          current_question_index?: number;
          game_state?: string;
          rounds?: any[];
        };
        Update: Partial<Database['public']['Tables']['game_rooms']['Insert']>;
      };
      players: {
        Row: {
          id: string;
          game_room_id: string;
          name: string;
          avatar: string;
          score: number;
          is_host: boolean;
          is_guest: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          game_room_id: string;
          name: string;
          avatar: string;
          score?: number;
          is_host?: boolean;
          is_guest?: boolean;
        };
        Update: Partial<Database['public']['Tables']['players']['Insert']>;
      };
      leaderboard: {
        Row: {
          id: string;
          player_name: string;
          player_avatar: string;
          score: number;
          is_guest: boolean;
          period: 'weekly' | 'monthly' | 'all_time';
          created_at: string;
        };
        Insert: {
          id?: string;
          player_name: string;
          player_avatar: string;
          score: number;
          is_guest?: boolean;
          period: 'weekly' | 'monthly' | 'all_time';
        };
        Update: Partial<Database['public']['Tables']['leaderboard']['Insert']>;
      };
    };
  };
}

// Realtime subscriptions for multiplayer
export const subscribeToRoom = (roomId: string, callback: (payload: any) => void) => {
  if (!supabase) return null;
  
  return supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'game_rooms',
        filter: `id=eq.${roomId}` 
      }, 
      callback
    )
    .subscribe();
};

export const subscribeToPlayers = (roomId: string, callback: (payload: any) => void) => {
  if (!supabase) return null;
  
  return supabase
    .channel(`players:${roomId}`)
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'players',
        filter: `game_room_id=eq.${roomId}` 
      }, 
      callback
    )
    .subscribe();
};
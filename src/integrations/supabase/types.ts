export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      game_rooms: {
        Row: {
          code: string
          created_at: string | null
          current_question_index: number | null
          game_state: string | null
          host_id: string
          id: string
          language: string
          max_questions: number | null
          name: string
          question_ids: string[] | null
          selected_packs: string[] | null
          updated_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          current_question_index?: number | null
          game_state?: string | null
          host_id: string
          id?: string
          language?: string
          max_questions?: number | null
          name: string
          question_ids?: string[] | null
          selected_packs?: string[] | null
          updated_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          current_question_index?: number | null
          game_state?: string | null
          host_id?: string
          id?: string
          language?: string
          max_questions?: number | null
          name?: string
          question_ids?: string[] | null
          selected_packs?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      game_rounds: {
        Row: {
          correct_answer: string
          created_at: string
          id: string
          phase: string
          question_id: string
          question_text: string
          room_id: string
          round_number: number
          updated_at: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          id?: string
          phase?: string
          question_id: string
          question_text: string
          room_id: string
          round_number: number
          updated_at?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          id?: string
          phase?: string
          question_id?: string
          question_text?: string
          room_id?: string
          round_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_rounds_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      player_answers: {
        Row: {
          answer_text: string
          id: string
          player_id: string
          round_id: string
          submitted_at: string
        }
        Insert: {
          answer_text: string
          id?: string
          player_id: string
          round_id: string
          submitted_at?: string
        }
        Update: {
          answer_text?: string
          id?: string
          player_id?: string
          round_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_answers_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_answers_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "game_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      player_votes: {
        Row: {
          id: string
          player_id: string
          round_id: string
          voted_at: string
          voted_for_answer_id: string | null
          voted_for_correct: boolean | null
        }
        Insert: {
          id?: string
          player_id: string
          round_id: string
          voted_at?: string
          voted_for_answer_id?: string | null
          voted_for_correct?: boolean | null
        }
        Update: {
          id?: string
          player_id?: string
          round_id?: string
          voted_at?: string
          voted_for_answer_id?: string | null
          voted_for_correct?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "player_votes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_votes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "game_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_votes_voted_for_answer_id_fkey"
            columns: ["voted_for_answer_id"]
            isOneToOne: false
            referencedRelation: "player_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar: string
          connected: boolean | null
          created_at: string | null
          id: string
          is_guest: boolean | null
          is_host: boolean | null
          last_active_at: string | null
          name: string
          room_id: string
          score: number | null
          updated_at: string | null
        }
        Insert: {
          avatar: string
          connected?: boolean | null
          created_at?: string | null
          id?: string
          is_guest?: boolean | null
          is_host?: boolean | null
          last_active_at?: string | null
          name: string
          room_id: string
          score?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar?: string
          connected?: boolean | null
          created_at?: string | null
          id?: string
          is_guest?: boolean | null
          is_host?: boolean | null
          last_active_at?: string | null
          name?: string
          room_id?: string
          score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          created_at: string | null
          games_played: number | null
          games_won: number | null
          id: string
          players_tricked: number | null
          second_places: number | null
          times_tricked: number | null
          total_points: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar?: string | null
          created_at?: string | null
          games_played?: number | null
          games_won?: number | null
          id: string
          players_tricked?: number | null
          second_places?: number | null
          times_tricked?: number | null
          total_points?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar?: string | null
          created_at?: string | null
          games_played?: number | null
          games_won?: number | null
          id?: string
          players_tricked?: number | null
          second_places?: number | null
          times_tricked?: number | null
          total_points?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      round_readiness: {
        Row: {
          id: string
          is_ready: boolean
          marked_ready_at: string | null
          player_id: string
          round_id: string
        }
        Insert: {
          id?: string
          is_ready?: boolean
          marked_ready_at?: string | null
          player_id: string
          round_id: string
        }
        Update: {
          id?: string
          is_ready?: boolean
          marked_ready_at?: string | null
          player_id?: string
          round_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_all_answers_submitted: {
        Args: { p_room_id: string; p_round_id: string }
        Returns: boolean
      }
      are_all_players_ready: {
        Args: { p_room_id: string; p_round_id: string }
        Returns: boolean
      }
      are_all_votes_submitted: {
        Args: { p_room_id: string; p_round_id: string }
        Returns: boolean
      }
      get_player_room_id: { Args: { player_id: string }; Returns: string }
      get_room_by_code: {
        Args: { p_code: string }
        Returns: {
          code: string
          game_state: string
          id: string
        }[]
      }
      is_room_participant: {
        Args: { player_id: string; room_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          thread_id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: []
      }
      itineraries: {
        Row: {
          budget: number | null
          created_at: string
          days: number
          id: string
          interests: string[] | null
          plan: Json
          start_city: string | null
          title: string
          travel_mode: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          days?: number
          id?: string
          interests?: string[] | null
          plan: Json
          start_city?: string | null
          title: string
          travel_mode?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          days?: number
          id?: string
          interests?: string[] | null
          plan?: Json
          start_city?: string | null
          title?: string
          travel_mode?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_budget: number | null
          display_name: string | null
          food_preference: string | null
          home_city: string | null
          home_state: string | null
          id: string
          preferred_travel_mode: string | null
          updated_at: string
          walking_difficulty: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_budget?: number | null
          display_name?: string | null
          food_preference?: string | null
          home_city?: string | null
          home_state?: string | null
          id: string
          preferred_travel_mode?: string | null
          updated_at?: string
          walking_difficulty?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_budget?: number | null
          display_name?: string | null
          food_preference?: string | null
          home_city?: string | null
          home_state?: string | null
          id?: string
          preferred_travel_mode?: string | null
          updated_at?: string
          walking_difficulty?: string | null
        }
        Relationships: []
      }
      temple_photo_repairs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          photo_uri: string | null
          source: string
          success: boolean
          temple_id: string
          triggered_by: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          photo_uri?: string | null
          source: string
          success: boolean
          temple_id: string
          triggered_by?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          photo_uri?: string | null
          source?: string
          success?: boolean
          temple_id?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "temple_photo_repairs_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
        ]
      }
      temples: {
        Row: {
          architecture: string | null
          best_time: string | null
          category: string
          city: string | null
          created_at: string
          deity: string | null
          description: string | null
          district: string | null
          dress_code: string | null
          estimated_budget: number | null
          festivals: string[] | null
          gallery: string[] | null
          google_photo_ref: string | null
          hero_image: string | null
          history: string | null
          id: string
          is_hidden_gem: boolean | null
          is_unesco: boolean | null
          latitude: number | null
          longitude: number | null
          name: string
          photography_rules: string | null
          rating: number | null
          slug: string
          speciality: string | null
          state: string
          tags: string[] | null
          timing: string | null
          travel_tips: string | null
          updated_at: string
        }
        Insert: {
          architecture?: string | null
          best_time?: string | null
          category: string
          city?: string | null
          created_at?: string
          deity?: string | null
          description?: string | null
          district?: string | null
          dress_code?: string | null
          estimated_budget?: number | null
          festivals?: string[] | null
          gallery?: string[] | null
          google_photo_ref?: string | null
          hero_image?: string | null
          history?: string | null
          id?: string
          is_hidden_gem?: boolean | null
          is_unesco?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name: string
          photography_rules?: string | null
          rating?: number | null
          slug: string
          speciality?: string | null
          state: string
          tags?: string[] | null
          timing?: string | null
          travel_tips?: string | null
          updated_at?: string
        }
        Update: {
          architecture?: string | null
          best_time?: string | null
          category?: string
          city?: string | null
          created_at?: string
          deity?: string | null
          description?: string | null
          district?: string | null
          dress_code?: string | null
          estimated_budget?: number | null
          festivals?: string[] | null
          gallery?: string[] | null
          google_photo_ref?: string | null
          hero_image?: string | null
          history?: string | null
          id?: string
          is_hidden_gem?: boolean | null
          is_unesco?: boolean | null
          latitude?: number | null
          longitude?: number | null
          name?: string
          photography_rules?: string | null
          rating?: number | null
          slug?: string
          speciality?: string | null
          state?: string
          tags?: string[] | null
          timing?: string | null
          travel_tips?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      travel_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      visited_places: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          photos: string[] | null
          place_name: string
          place_state: string | null
          rating: number | null
          temple_id: string | null
          user_id: string
          visit_date: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          photos?: string[] | null
          place_name: string
          place_state?: string | null
          rating?: number | null
          temple_id?: string | null
          user_id: string
          visit_date?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          photos?: string[] | null
          place_name?: string
          place_state?: string | null
          rating?: number | null
          temple_id?: string | null
          user_id?: string
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visited_places_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist: {
        Row: {
          created_at: string
          custom_location: string | null
          custom_name: string | null
          id: string
          note: string | null
          temple_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_location?: string | null
          custom_name?: string | null
          id?: string
          note?: string | null
          temple_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          custom_location?: string | null
          custom_name?: string | null
          id?: string
          note?: string | null
          temple_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_temple_id_fkey"
            columns: ["temple_id"]
            isOneToOne: false
            referencedRelation: "temples"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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

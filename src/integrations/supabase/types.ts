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
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          created_at: string
          details: Json
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id: string
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          active: boolean
          created_at: string
          id: string
          message: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          message: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          message?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          is_secret: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          is_secret?: boolean
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          is_secret?: boolean
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      broadcasts: {
        Row: {
          body: string
          created_at: string
          created_by: string
          id: string
          level: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          id?: string
          level?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          level?: string
          title?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          model: string | null
          provider: string | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          model?: string | null
          provider?: string | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          model?: string | null
          provider?: string | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_plans: {
        Row: {
          created_at: string
          date: string
          id: string
          plan: Json
          summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          plan?: Json
          summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          plan?: Json
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      education_articles: {
        Row: {
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tracking_logs: {
        Row: {
          created_at: string
          date: string
          energy: number | null
          id: string
          mood: number | null
          notes: string | null
          sleep_hours: number | null
          sleep_quality: number | null
          symptoms: Json | null
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          energy?: number | null
          id?: string
          mood?: number | null
          notes?: string | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          symptoms?: Json | null
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          energy?: number | null
          id?: string
          mood?: number | null
          notes?: string | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          symptoms?: Json | null
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      uploads: {
        Row: {
          created_at: string
          file_path: string
          id: string
          mime: string | null
          size: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_path: string
          id?: string
          mime?: string | null
          size?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_path?: string
          id?: string
          mime?: string | null
          size?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string
          broadcast_id: string | null
          created_at: string
          id: string
          level: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          broadcast_id?: string | null
          created_at?: string
          id?: string
          level?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          broadcast_id?: string | null
          created_at?: string
          id?: string
          level?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          banned: boolean
          banned_at: string | null
          banned_by: string | null
          banned_reason: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          banned?: boolean
          banned_at?: string | null
          banned_by?: string | null
          banned_reason?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          banned?: boolean
          banned_at?: string | null
          banned_by?: string | null
          banned_reason?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_banned: { Args: { _user_id: string }; Returns: boolean }
      log_admin_action: {
        Args: {
          _action: string
          _details?: Json
          _target_id?: string
          _target_type?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const

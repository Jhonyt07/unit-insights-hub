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
      dados_overview: {
        Row: {
          created_at: string
          filial_id: number
          id: string
          mes: string
          sku_codigo: string
          updated_at: string
          updated_by: string | null
          valor: number
        }
        Insert: {
          created_at?: string
          filial_id: number
          id?: string
          mes: string
          sku_codigo: string
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Update: {
          created_at?: string
          filial_id?: number
          id?: string
          mes?: string
          sku_codigo?: string
          updated_at?: string
          updated_by?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "dados_overview_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dados_overview_sku_codigo_fkey"
            columns: ["sku_codigo"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["codigo"]
          },
        ]
      }
      faturado: {
        Row: {
          cliente_nome: string | null
          created_at: string
          filial_id: number
          id: string
          mes: string
          sku_codigo: string
          valor: number
        }
        Insert: {
          cliente_nome?: string | null
          created_at?: string
          filial_id: number
          id?: string
          mes: string
          sku_codigo: string
          valor?: number
        }
        Update: {
          cliente_nome?: string | null
          created_at?: string
          filial_id?: number
          id?: string
          mes?: string
          sku_codigo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturado_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturado_sku_codigo_fkey"
            columns: ["sku_codigo"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["codigo"]
          },
        ]
      }
      filiais: {
        Row: {
          ativo: boolean
          created_at: string
          id: number
          nome: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id: number
          nome: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: number
          nome?: string
        }
        Relationships: []
      }
      indicadores_mes: {
        Row: {
          a_expedir: number | null
          created_at: string
          estoque_atual: number | null
          filial_id: number
          id: string
          mes: string
          produzido: number | null
          projetado: number | null
          sku_codigo: string
        }
        Insert: {
          a_expedir?: number | null
          created_at?: string
          estoque_atual?: number | null
          filial_id: number
          id?: string
          mes: string
          produzido?: number | null
          projetado?: number | null
          sku_codigo: string
        }
        Update: {
          a_expedir?: number | null
          created_at?: string
          estoque_atual?: number | null
          filial_id?: number
          id?: string
          mes?: string
          produzido?: number | null
          projetado?: number | null
          sku_codigo?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicadores_mes_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicadores_mes_sku_codigo_fkey"
            columns: ["sku_codigo"]
            isOneToOne: false
            referencedRelation: "skus"
            referencedColumns: ["codigo"]
          },
        ]
      }
      meses_habilitados: {
        Row: {
          created_at: string
          habilitado: boolean
          habilitado_por: string | null
          id: string
          mes: string
        }
        Insert: {
          created_at?: string
          habilitado?: boolean
          habilitado_por?: string | null
          id?: string
          mes: string
        }
        Update: {
          created_at?: string
          habilitado?: boolean
          habilitado_por?: string | null
          id?: string
          mes?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      skus: {
        Row: {
          codigo: string
          created_at: string
          descricao: string
          full_label: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao: string
          full_label: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string
          full_label?: string
        }
        Relationships: []
      }
      user_filiais: {
        Row: {
          filial_id: number
          granted_at: string
          id: string
          user_id: string
        }
        Insert: {
          filial_id: number
          granted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          filial_id?: number
          granted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_filiais_filial_id_fkey"
            columns: ["filial_id"]
            isOneToOne: false
            referencedRelation: "filiais"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      user_has_filial: {
        Args: { _filial_id: number; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "leitor"
      user_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "editor", "leitor"],
      user_status: ["pending", "approved", "rejected"],
    },
  },
} as const

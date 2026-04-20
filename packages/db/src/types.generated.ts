export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      areas: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          room_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          room_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          room_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'areas_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
        ];
      };
      cleaning_cycles: {
        Row: {
          created_at: string;
          frequency_unit: Database['public']['Enums']['frequency_unit'];
          frequency_value: number;
          id: string;
          item_id: string;
          last_done_at: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          frequency_unit: Database['public']['Enums']['frequency_unit'];
          frequency_value: number;
          id?: string;
          item_id: string;
          last_done_at?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          frequency_unit?: Database['public']['Enums']['frequency_unit'];
          frequency_value?: number;
          id?: string;
          item_id?: string;
          last_done_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cleaning_cycles_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: true;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
        ];
      };
      home_members: {
        Row: {
          created_at: string;
          home_id: string;
          role: Database['public']['Enums']['home_role'];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          home_id: string;
          role?: Database['public']['Enums']['home_role'];
          user_id: string;
        };
        Update: {
          created_at?: string;
          home_id?: string;
          role?: Database['public']['Enums']['home_role'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'home_members_home_id_fkey';
            columns: ['home_id'];
            isOneToOne: false;
            referencedRelation: 'homes';
            referencedColumns: ['id'];
          },
        ];
      };
      homes: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      instruction_products: {
        Row: {
          instruction_id: string;
          product_id: string;
        };
        Insert: {
          instruction_id: string;
          product_id: string;
        };
        Update: {
          instruction_id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'instruction_products_instruction_id_fkey';
            columns: ['instruction_id'];
            isOneToOne: false;
            referencedRelation: 'instructions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'instruction_products_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      instruction_tools: {
        Row: {
          instruction_id: string;
          tool_id: string;
        };
        Insert: {
          instruction_id: string;
          tool_id: string;
        };
        Update: {
          instruction_id?: string;
          tool_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'instruction_tools_instruction_id_fkey';
            columns: ['instruction_id'];
            isOneToOne: false;
            referencedRelation: 'instructions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'instruction_tools_tool_id_fkey';
            columns: ['tool_id'];
            isOneToOne: false;
            referencedRelation: 'tools';
            referencedColumns: ['id'];
          },
        ];
      };
      instructions: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body?: string;
          created_at?: string;
          id?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      items: {
        Row: {
          area_id: string;
          created_at: string;
          id: string;
          instruction_id: string | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          area_id: string;
          created_at?: string;
          id?: string;
          instruction_id?: string | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          area_id?: string;
          created_at?: string;
          id?: string;
          instruction_id?: string | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'items_area_id_fkey';
            columns: ['area_id'];
            isOneToOne: false;
            referencedRelation: 'areas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_instruction_id_fkey';
            columns: ['instruction_id'];
            isOneToOne: false;
            referencedRelation: 'instructions';
            referencedColumns: ['id'];
          },
        ];
      };
      products: {
        Row: {
          brand: string | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          brand?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          brand?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          created_at: string;
          home_id: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          home_id: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          home_id?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rooms_home_id_fkey';
            columns: ['home_id'];
            isOneToOne: false;
            referencedRelation: 'homes';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          assigned_to: string | null;
          completed_at: string | null;
          completed_by: string | null;
          created_at: string;
          cycle_id: string;
          due_at: string;
          id: string;
          status: Database['public']['Enums']['task_status'];
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          cycle_id: string;
          due_at: string;
          id?: string;
          status?: Database['public']['Enums']['task_status'];
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          created_at?: string;
          cycle_id?: string;
          due_at?: string;
          id?: string;
          status?: Database['public']['Enums']['task_status'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_cycle_id_fkey';
            columns: ['cycle_id'];
            isOneToOne: false;
            referencedRelation: 'cleaning_cycles';
            referencedColumns: ['id'];
          },
        ];
      };
      tools: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_user_id: { Args: never; Returns: string };
      is_home_member: { Args: { target_home_id: string }; Returns: boolean };
      is_home_owner: { Args: { target_home_id: string }; Returns: boolean };
    };
    Enums: {
      frequency_unit: 'day' | 'week' | 'month' | 'year';
      home_role: 'owner' | 'member';
      task_status: 'pending' | 'done' | 'skipped';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      frequency_unit: ['day', 'week', 'month', 'year'],
      home_role: ['owner', 'member'],
      task_status: ['pending', 'done', 'skipped'],
    },
  },
} as const;

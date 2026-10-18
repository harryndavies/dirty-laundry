
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "chores": {
                  Row: {
                    "area": string | null,"assigned_to": string | null,"base_points": number,"boosted_by": string | null,"created_at": string,"created_by": string | null,"group_id": string,"id": string,"is_persistent": boolean,"name": string,"points": number,"reminder_day": number | null,"reminder_time": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "area"?: string | null,"assigned_to"?: string | null,"base_points"?: number,"boosted_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"group_id": string,"id"?: string,"is_persistent"?: boolean,"name": string,"points"?: number,"reminder_day"?: number | null,"reminder_time"?: string | null
                  }
                  Update: {
                    "area"?: string | null,"assigned_to"?: string | null,"base_points"?: number,"boosted_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"group_id"?: string,"id"?: string,"is_persistent"?: boolean,"name"?: string,"points"?: number,"reminder_day"?: number | null,"reminder_time"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "chores_assigned_to_fkey"
      columns: ["assigned_to"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chores_boosted_by_fkey"
      columns: ["boosted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chores_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "chores_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"completions": {
                  Row: {
                    "chore_id": string | null,"chore_name": string | null,"completed_at": string,"group_id": string,"id": string,"photo_before_url": string | null,"photo_url": string | null,"points_earned": number,"user_id": string,"with_user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "chore_id"?: string | null,"chore_name"?: string | null,"completed_at"?: string,"group_id": string,"id"?: string,"photo_before_url"?: string | null,"photo_url"?: string | null,"points_earned": number,"user_id": string,"with_user_id"?: string | null
                  }
                  Update: {
                    "chore_id"?: string | null,"chore_name"?: string | null,"completed_at"?: string,"group_id"?: string,"id"?: string,"photo_before_url"?: string | null,"photo_url"?: string | null,"points_earned"?: number,"user_id"?: string,"with_user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "completions_chore_id_fkey"
      columns: ["chore_id"]
isOneToOne: false
      referencedRelation: "chores"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "completions_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "completions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "completions_with_user_id_fkey"
      columns: ["with_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "chore_share": number,"group_id": string,"id": string,"monthly_prize": string | null,"paid_up_to": string | null,"role": string,"savings_goal": number | null,"savings_goal_name": string | null,"total_points": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "chore_share"?: number,"group_id": string,"id"?: string,"monthly_prize"?: string | null,"paid_up_to"?: string | null,"role"?: string,"savings_goal"?: number | null,"savings_goal_name"?: string | null,"total_points"?: number,"user_id": string
                  }
                  Update: {
                    "chore_share"?: number,"group_id"?: string,"id"?: string,"monthly_prize"?: string | null,"paid_up_to"?: string | null,"role"?: string,"savings_goal"?: number | null,"savings_goal_name"?: string | null,"total_points"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"invite_code": string,"is_pro": boolean,"name": string,"pocket_money_rate": number | null,"stripe_payment_id": string | null,"weekly_goal": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"invite_code"?: string,"is_pro"?: boolean,"name": string,"pocket_money_rate"?: number | null,"stripe_payment_id"?: string | null,"weekly_goal"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"invite_code"?: string,"is_pro"?: boolean,"name"?: string,"pocket_money_rate"?: number | null,"stripe_payment_id"?: string | null,"weekly_goal"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"invitations": {
                  Row: {
                    "created_at": string,"group_id": string,"id": string,"invited_by": string | null,"invited_email": string,"status": string,"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"group_id": string,"id"?: string,"invited_by"?: string | null,"invited_email": string,"status"?: string,"token"?: string
                  }
                  Update: {
                    "created_at"?: string,"group_id"?: string,"id"?: string,"invited_by"?: string | null,"invited_email"?: string,"status"?: string,"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"nudges": {
                  Row: {
                    "created_at": string,"from_user_id": string,"group_id": string,"id": string,"seen": boolean,"to_user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_user_id": string,"group_id": string,"id"?: string,"seen"?: boolean,"to_user_id": string
                  }
                  Update: {
                    "created_at"?: string,"from_user_id"?: string,"group_id"?: string,"id"?: string,"seen"?: boolean,"to_user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "nudges_from_user_id_fkey"
      columns: ["from_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nudges_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nudges_to_user_id_fkey"
      columns: ["to_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payouts": {
                  Row: {
                    "amount_pence": number,"created_at": string,"group_id": string,"id": string,"paid_by": string,"points": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_pence": number,"created_at"?: string,"group_id": string,"id"?: string,"paid_by": string,"points": number,"user_id": string
                  }
                  Update: {
                    "amount_pence"?: number,"created_at"?: string,"group_id"?: string,"id"?: string,"paid_by"?: string,"points"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payouts_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payouts_paid_by_fkey"
      columns: ["paid_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payouts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_color": string,"avatar_url": string | null,"created_at": string,"display_name": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_color"?: string,"avatar_url"?: string | null,"created_at"?: string,"display_name": string,"id": string
                  }
                  Update: {
                    "avatar_color"?: string,"avatar_url"?: string | null,"created_at"?: string,"display_name"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"push_subscriptions": {
                  Row: {
                    "created_at": string,"device_token": string | null,"endpoint": string | null,"id": string,"keys_auth": string | null,"keys_p256dh": string | null,"platform": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"device_token"?: string | null,"endpoint"?: string | null,"id"?: string,"keys_auth"?: string | null,"keys_p256dh"?: string | null,"platform"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"device_token"?: string | null,"endpoint"?: string | null,"id"?: string,"keys_auth"?: string | null,"keys_p256dh"?: string | null,"platform"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reactions": {
                  Row: {
                    "completion_id": string,"created_at": string,"emoji": string,"id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completion_id": string,"created_at"?: string,"emoji": string,"id"?: string,"user_id": string
                  }
                  Update: {
                    "completion_id"?: string,"created_at"?: string,"emoji"?: string,"id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reactions_completion_id_fkey"
      columns: ["completion_id"]
isOneToOne: false
      referencedRelation: "completions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reactions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "complete_chore":
{ Args: { "p_chore_id": string,"p_photo_before_url"?: string,"p_photo_url"?: string,"p_with_user_id"?: string }; Returns: Json
                           },
"get_my_group_ids":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           },
"join_group_by_code":
{ Args: { "p_code": string }; Returns: Json
                           },
"mark_paid":
{ Args: { "p_amount_pence": number,"p_member_id": string,"p_points": number }; Returns: undefined
                           },
"match_document_chunks":
{ Args: { "filter_user"?: string,"match_count"?: number,"min_similarity"?: number,"query_embedding": string }; Returns: {
              "chunk_index": number,"chunk_text": string,"document_id": string,"id": string,"metadata_json": Json,"section_type": string,"similarity": number
            }[]
                           },
"undo_completion":
{ Args: { "p_completion_id": string }; Returns: undefined
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const

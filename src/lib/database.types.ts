export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_color: string
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_color?: string
        }
        Update: {
          display_name?: string
          avatar_color?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_by: string
          created_at: string
          weekly_goal: number | null
        }
        Insert: {
          name: string
          created_by: string
        }
        Update: {
          name?: string
          weekly_goal?: number | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'owner' | 'member'
          total_points: number
          chore_share: number
          monthly_prize: string | null
        }
        Insert: {
          group_id: string
          user_id: string
          role?: 'owner' | 'member'
          chore_share?: number
          monthly_prize?: string | null
        }
        Update: {
          total_points?: number
          chore_share?: number
          monthly_prize?: string | null
        }
        Relationships: []
      }
      chores: {
        Row: {
          id: string
          group_id: string
          name: string
          points: number
          base_points: number
          boosted_by: string | null
          is_persistent: boolean
          created_by: string
          created_at: string
          reminder_day: number | null
          reminder_time: string | null
          area: string | null
        }
        Insert: {
          group_id: string
          name: string
          points?: number
          base_points?: number
          boosted_by?: string | null
          is_persistent?: boolean
          created_by: string
          reminder_day?: number | null
          reminder_time?: string | null
          area?: string | null
        }
        Update: {
          name?: string
          points?: number
          base_points?: number
          boosted_by?: string | null
          is_persistent?: boolean
          reminder_day?: number | null
          reminder_time?: string | null
          area?: string | null
        }
        Relationships: []
      }
      completions: {
        Row: {
          id: string
          chore_id: string
          user_id: string
          group_id: string
          points_earned: number
          completed_at: string
          chore_name: string | null
        }
        Insert: {
          chore_id: string
          user_id: string
          group_id: string
          points_earned: number
          chore_name?: string | null
        }
        Update: Record<string, never>
        Relationships: []
      }
      invitations: {
        Row: {
          id: string
          group_id: string
          invited_email: string
          invited_by: string
          status: 'pending' | 'accepted'
          token: string
          created_at: string
        }
        Insert: {
          group_id: string
          invited_email: string
          invited_by: string
        }
        Update: {
          status?: 'pending' | 'accepted'
        }
        Relationships: []
      }
      nudges: {
        Row: {
          id: string
          group_id: string
          from_user_id: string
          to_user_id: string
          created_at: string
          seen: boolean
        }
        Insert: {
          group_id: string
          from_user_id: string
          to_user_id: string
        }
        Update: {
          seen?: boolean
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          keys_p256dh: string
          keys_auth: string
          created_at: string
        }
        Insert: {
          user_id: string
          endpoint: string
          keys_p256dh: string
          keys_auth: string
        }
        Update: {
          endpoint?: string
          keys_p256dh?: string
          keys_auth?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          id: string
          completion_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          completion_id: string
          user_id: string
          emoji: string
        }
        Update: Record<string, never>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row']
export type Chore = Database['public']['Tables']['chores']['Row']
export type Completion = Database['public']['Tables']['completions']['Row']
export type Invitation = Database['public']['Tables']['invitations']['Row']
export type Nudge = Database['public']['Tables']['nudges']['Row']

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
      }
      groups: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_by: string
          created_at: string
        }
        Insert: {
          name: string
          created_by: string
        }
        Update: {
          name?: string
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'owner' | 'member'
          total_points: number
        }
        Insert: {
          group_id: string
          user_id: string
          role?: 'owner' | 'member'
        }
        Update: {
          total_points?: number
        }
      }
      chores: {
        Row: {
          id: string
          group_id: string
          name: string
          points: number
          is_persistent: boolean
          created_by: string
          created_at: string
        }
        Insert: {
          group_id: string
          name: string
          points?: number
          is_persistent?: boolean
          created_by: string
        }
        Update: {
          name?: string
          points?: number
          is_persistent?: boolean
        }
      }
      completions: {
        Row: {
          id: string
          chore_id: string
          user_id: string
          group_id: string
          points_earned: number
          completed_at: string
        }
        Insert: {
          chore_id: string
          user_id: string
          group_id: string
          points_earned: number
        }
        Update: Record<string, never>
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
      }
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMember = Database['public']['Tables']['group_members']['Row']
export type Chore = Database['public']['Tables']['chores']['Row']
export type Completion = Database['public']['Tables']['completions']['Row']
export type Invitation = Database['public']['Tables']['invitations']['Row']

// Friendly names for database rows. `database.types.ts` is generated
// (npm run db:types); this file adds what generation can't express.
import { z } from 'zod'
import type { Database } from './database.types'

type Tables = Database['public']['Tables']

export const RoleSchema = z.enum(['owner', 'member', 'kid'])
export type Role = z.infer<typeof RoleSchema>

export type Profile = Tables['profiles']['Row']
export type Group = Tables['groups']['Row']
export type GroupMember = Omit<Tables['group_members']['Row'], 'role'> & { role: Role }
export type Chore = Tables['chores']['Row']
export type Completion = Tables['completions']['Row']
export type Invitation = Tables['invitations']['Row']
export type Nudge = Tables['nudges']['Row']

/** A member row from the database, with its role checked (the column is plain text). */
export function asMember<T extends { role: string }>(row: T): Omit<T, 'role'> & { role: Role } {
  return { ...row, role: RoleSchema.parse(row.role) }
}

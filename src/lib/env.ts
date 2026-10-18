import { z } from 'zod'

// Checked once at start-up so a missing key fails loudly, not as a vague Supabase error.
const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
})

const parsed = EnvSchema.safeParse(import.meta.env)
if (!parsed.success) {
  throw new Error(
    `Missing or invalid environment variables (see .env.example): ${parsed.error.issues
      .map(i => i.path.join('.'))
      .join(', ')}`,
  )
}

export const env = parsed.data

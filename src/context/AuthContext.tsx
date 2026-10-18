import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { SignInWithApple, type SignInWithAppleResponse } from '@capacitor-community/apple-sign-in'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/db'

interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInAnonymously: (displayName: string) => Promise<{ error: string | null }>
  signInWithApple: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
  updateProfile: (updates: {
    display_name?: string
    avatar_color?: string
    avatar_url?: string | null
  }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email: string, password: string, displayName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signInAnonymously(displayName: string) {
    const { error } = await supabase.auth.signInAnonymously({
      options: {
        data: { display_name: displayName },
      },
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signInWithApple() {
    try {
      const result: SignInWithAppleResponse = await SignInWithApple.authorize({
        clientId: 'club.dirtylaundry.app',
        redirectURI: 'https://ldluxsoyevjrzualmfvo.supabase.co/auth/v1/callback',
        scopes: 'email name',
      })

      const idToken = result.response?.identityToken
      if (!idToken) return { error: 'Apple sign-in returned no token' }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: idToken,
      })
      if (error) return { error: error.message }

      // Apple only gives us the user's name on the very first sign-in. If we
      // got one, persist it as the display_name (the trigger creates a
      // placeholder from the email, which is usually a privacy-relay string).
      const first = result.response?.givenName?.trim()
      const last = result.response?.familyName?.trim()
      const fullName = [first, last].filter(Boolean).join(' ')
      if (fullName && data.user) {
        await supabase.from('profiles').update({ display_name: fullName }).eq('id', data.user.id)
      }

      return { error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apple sign-in failed'
      if (
        message.toLowerCase().includes('canceled') ||
        message.toLowerCase().includes('cancelled')
      ) {
        return { error: null }
      }
      return { error: message }
    }
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  async function updateProfile(updates: {
    display_name?: string
    avatar_color?: string
    avatar_url?: string | null
  }) {
    if (!user) return
    const { error } = await supabase.from('profiles').update(updates).eq('id', user.id)
    if (error) {
      console.error('Profile update error:', error)
      return
    }
    setProfile((prev) => (prev ? { ...prev, ...updates } : prev))
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signUp,
        signIn,
        signInAnonymously,
        signInWithApple,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

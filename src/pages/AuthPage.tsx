import { useState, useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isNativeIOS } from '@/lib/platform'

export function AuthPage() {
  const { session, signIn, signUp, signInAnonymously, signInWithApple, resetPassword } = useAuth()
  const [searchParams] = useSearchParams()
  const inviteCode = searchParams.get('code')

  useEffect(() => {
    if (inviteCode) {
      localStorage.setItem('dirtylaundry_invite_code', inviteCode)
    }
  }, [inviteCode])
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [anonName, setAnonName] = useState('')
  const [showAnon, setShowAnon] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signedUp, setSignedUp] = useState(false)
  const [showAbout, setShowAbout] = useState(!inviteCode)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await resetPassword(forgotEmail)
    if (error) {
      setError(error)
    } else {
      setResetSent(true)
    }
    setLoading(false)
  }

  if (session) return <Navigate to="/chores" replace />

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(loginEmail, loginPassword)
    if (error) setError(error)
    setLoading(false)
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signUp(signupEmail, signupPassword, signupName)
    if (error) {
      setError(error)
    } else {
      setSignedUp(true)
    }
    setLoading(false)
  }

  async function handleAppleSignIn() {
    setError('')
    setLoading(true)
    const { error } = await signInWithApple()
    if (error) setError(error)
    setLoading(false)
  }

  const appleButton = isNativeIOS && (
    <button
      type="button"
      onClick={handleAppleSignIn}
      disabled={loading}
      className="flex h-12 w-full items-center justify-center gap-2 border-2 border-brutal-black bg-brutal-black font-mono text-sm font-bold text-brutal-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-50"
    >
      <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden="true">
        <path d="M13.2 9.6c0-2.3 1.9-3.4 2-3.4-1-1.6-2.7-1.8-3.3-1.8-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.8 2.3 1.1 0 1.6-.7 2.9-.7 1.4 0 1.8.7 3 .7 1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.6zM11 2.9c.6-.7 1-1.7 1-2.7-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.6-1 2.6 1.1.1 2-.5 2.6-1.2z" />
      </svg>
      {loading ? 'SIGNING IN...' : 'CONTINUE WITH APPLE'}
    </button>
  )

  const orDivider = isNativeIOS && (
    <div className="my-3 flex items-center gap-3">
      <div className="h-px flex-1 bg-brutal-black/20" />
      <span className="font-mono text-[10px] font-bold text-brutal-black/40">OR</span>
      <div className="h-px flex-1 bg-brutal-black/20" />
    </div>
  )

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-brutal-yellow px-4"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="w-full max-w-sm border-4 border-brutal-black bg-brutal-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] md:max-w-md md:p-8">
        <div className="mb-6 flex justify-center">
          <img src="/logo.png" alt="Dirty Laundry" className="h-auto w-48" />
        </div>

        {showAbout ? (
          <div className="space-y-4">
            <div className="border-2 border-brutal-black bg-brutal-yellow/30 p-4">
              <h2 className="mb-3 font-mono text-sm font-bold">WHAT'S THIS ABOUT?</h2>
              <p className="font-mono text-xs leading-relaxed text-brutal-black/80">
                Housework is boring. Nobody wants to do it. But{' '}
                <span className="font-bold">someone</span> has to.
              </p>
              <p className="mt-2 font-mono text-xs leading-relaxed text-brutal-black/80">
                Dirty Laundry turns your household chores into a game. Add chores, earn points,
                climb the leaderboard, and make the boring stuff a bit more fun.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3 p-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-brutal-black bg-brutal-lime font-mono text-sm font-bold">
                  1
                </span>
                <p className="pt-1 font-mono text-xs text-brutal-black/70">
                  Create a group and invite your partner, housemates, whoever
                </p>
              </div>
              <div className="flex items-start gap-3 p-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-brutal-black bg-brutal-pink font-mono text-sm font-bold text-brutal-white">
                  2
                </span>
                <p className="pt-1 font-mono text-xs text-brutal-black/70">
                  Add chores and assign point values — scrubbing the oven is worth more than wiping
                  a counter
                </p>
              </div>
              <div className="flex items-start gap-3 p-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-brutal-black bg-brutal-blue font-mono text-sm font-bold text-brutal-white">
                  3
                </span>
                <p className="pt-1 font-mono text-xs text-brutal-black/70">
                  Complete chores, earn points, and climb the leaderboard. It's weirdly motivating
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowAbout(false)}
              className="h-12 w-full border-2 border-brutal-black bg-brutal-black font-mono text-sm font-bold text-brutal-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            >
              GET STARTED
            </Button>
          </div>
        ) : signedUp ? (
          <div className="py-8 text-center">
            <div className="mb-4 text-4xl">📬</div>
            <h2 className="mb-2 font-mono text-lg font-bold">CHECK YOUR EMAIL</h2>
            <p className="font-mono text-sm text-brutal-black/60">
              We sent you a confirmation link. Click it to activate your account.
            </p>
          </div>
        ) : isNativeIOS ? (
          <div className="space-y-3">
            {error && (
              <div className="border-2 border-brutal-pink bg-brutal-pink/20 p-3 font-mono text-xs font-bold">
                {error}
              </div>
            )}
            {appleButton}
            {orDivider}
            {showAnon ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!anonName.trim()) return
                  setLoading(true)
                  setError('')
                  const { error } = await signInAnonymously(anonName.trim())
                  if (error) setError(error)
                  setLoading(false)
                }}
                className="space-y-3"
              >
                <p className="text-center font-mono text-xs text-brutal-black/50">
                  Just enter your name to get started
                </p>
                <Input
                  value={anonName}
                  onChange={(e) => setAnonName(e.target.value)}
                  placeholder="Your name"
                  className="h-12 border-2 border-brutal-black text-center font-mono"
                  autoFocus
                  required
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full border-2 border-brutal-black bg-brutal-lime font-mono text-sm font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                >
                  {loading ? 'JOINING...' : 'JOIN WITHOUT ACCOUNT'}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAnon(false)
                    setError('')
                  }}
                  className="w-full py-2 font-mono text-xs font-bold text-brutal-black/40 active:text-brutal-black/60"
                >
                  ← BACK
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowAnon(true)}
                className="w-full py-2 font-mono text-xs font-bold text-brutal-black/40 active:text-brutal-black/60"
              >
                NO APPLE ID? JOIN AS A GUEST
              </button>
            )}
          </div>
        ) : (
          <Tabs defaultValue="signup">
            <TabsList className="h-auto w-full border-2 border-brutal-black bg-brutal-black/5 p-0">
              <TabsTrigger
                value="login"
                className="flex-1 rounded-none py-3 font-mono text-xs font-bold uppercase data-[state=active]:bg-brutal-black data-[state=active]:text-brutal-white"
              >
                LOGIN
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="flex-1 rounded-none py-3 font-mono text-xs font-bold uppercase data-[state=active]:bg-brutal-black data-[state=active]:text-brutal-white"
              >
                SIGN UP
              </TabsTrigger>
            </TabsList>

            {error && (
              <div className="mt-4 border-2 border-brutal-pink bg-brutal-pink/20 p-3 font-mono text-xs font-bold">
                {error}
              </div>
            )}

            <TabsContent value="login">
              {showForgot ? (
                resetSent ? (
                  <div className="py-8 text-center">
                    <div className="mb-4 text-4xl">📬</div>
                    <h2 className="mb-2 font-mono text-lg font-bold">CHECK YOUR EMAIL</h2>
                    <p className="font-mono text-sm text-brutal-black/60">
                      We sent a password reset link to {forgotEmail}
                    </p>
                    <button
                      onClick={() => {
                        setShowForgot(false)
                        setResetSent(false)
                        setError('')
                      }}
                      className="mt-4 font-mono text-xs font-bold text-brutal-blue active:opacity-60"
                    >
                      BACK TO LOGIN
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="mt-4 space-y-4">
                    <p className="font-mono text-xs text-brutal-black/60">
                      Enter your email and we'll send you a reset link.
                    </p>
                    <div>
                      <label className="mb-1 block font-mono text-xs font-bold uppercase">
                        EMAIL
                      </label>
                      <Input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="h-12 border-2 border-brutal-black font-mono"
                        required
                        autoFocus
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-12 w-full border-2 border-brutal-black bg-brutal-black font-mono text-sm font-bold text-brutal-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                    >
                      {loading ? 'SENDING...' : 'SEND RESET LINK'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgot(false)
                        setError('')
                      }}
                      className="w-full font-mono text-xs font-bold text-brutal-black/50 active:opacity-60"
                    >
                      BACK TO LOGIN
                    </button>
                  </form>
                )
              ) : (
                <form onSubmit={handleLogin} className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1 block font-mono text-xs font-bold uppercase">
                      EMAIL
                    </label>
                    <Input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="h-12 border-2 border-brutal-black font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-mono text-xs font-bold uppercase">
                      PASSWORD
                    </label>
                    <Input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="h-12 border-2 border-brutal-black font-mono"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 w-full border-2 border-brutal-black bg-brutal-black font-mono text-sm font-bold text-brutal-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                  >
                    {loading ? 'LOADING...' : 'LOG IN'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot(true)
                      setForgotEmail(loginEmail)
                      setError('')
                    }}
                    className="w-full font-mono text-xs font-bold text-brutal-black/50 active:opacity-60"
                  >
                    FORGOT PASSWORD?
                  </button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup">
              {showAnon ? (
                <div className="mt-4">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      if (!anonName.trim()) return
                      setLoading(true)
                      setError('')
                      const { error } = await signInAnonymously(anonName.trim())
                      if (error) setError(error)
                      setLoading(false)
                    }}
                    className="space-y-3"
                  >
                    <p className="text-center font-mono text-xs text-brutal-black/50">
                      Just enter your name to get started
                    </p>
                    <Input
                      value={anonName}
                      onChange={(e) => setAnonName(e.target.value)}
                      placeholder="Your name"
                      className="h-12 border-2 border-brutal-black text-center font-mono"
                      autoFocus
                      required
                    />
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-12 w-full border-2 border-brutal-black bg-brutal-lime font-mono text-sm font-bold uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                    >
                      {loading ? 'JOINING...' : 'JOIN WITHOUT ACCOUNT'}
                    </Button>
                  </form>
                  <button
                    onClick={() => setShowAnon(false)}
                    className="mt-3 w-full py-2 font-mono text-xs font-bold text-brutal-black/40 active:text-brutal-black/60"
                  >
                    ← BACK TO SIGN UP
                  </button>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSignup} className="mt-4 space-y-4">
                    <div>
                      <label className="mb-1 block font-mono text-xs font-bold uppercase">
                        DISPLAY NAME
                      </label>
                      <Input
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="h-12 border-2 border-brutal-black font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-mono text-xs font-bold uppercase">
                        EMAIL
                      </label>
                      <Input
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="h-12 border-2 border-brutal-black font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-mono text-xs font-bold uppercase">
                        PASSWORD
                      </label>
                      <Input
                        type="password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="h-12 border-2 border-brutal-black font-mono"
                        minLength={6}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-12 w-full border-2 border-brutal-black bg-brutal-pink font-mono text-sm font-bold text-brutal-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
                    >
                      {loading ? 'LOADING...' : 'CREATE ACCOUNT'}
                    </Button>
                  </form>

                  <div className="mt-4 border-t-2 border-brutal-black/10 pt-4">
                    <button
                      onClick={() => setShowAnon(true)}
                      className="w-full py-2 font-mono text-xs font-bold text-brutal-black/40 active:text-brutal-black/60"
                    >
                      NO EMAIL? JOIN WITHOUT AN ACCOUNT
                    </button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

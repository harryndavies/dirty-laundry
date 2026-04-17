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
      className="w-full h-12 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
    >
      <svg width="16" height="18" viewBox="0 0 16 18" fill="currentColor" aria-hidden="true">
        <path d="M13.2 9.6c0-2.3 1.9-3.4 2-3.4-1-1.6-2.7-1.8-3.3-1.8-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-3-.8-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.8 2.3 1.1 0 1.6-.7 2.9-.7 1.4 0 1.8.7 3 .7 1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.6zM11 2.9c.6-.7 1-1.7 1-2.7-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.6-1 2.6 1.1.1 2-.5 2.6-1.2z"/>
      </svg>
      {loading ? 'SIGNING IN...' : 'CONTINUE WITH APPLE'}
    </button>
  )

  const orDivider = isNativeIOS && (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-brutal-black/20" />
      <span className="font-mono text-[10px] font-bold text-brutal-black/40">OR</span>
      <div className="flex-1 h-px bg-brutal-black/20" />
    </div>
  )

  return (
    <div className="min-h-screen bg-brutal-yellow flex items-center justify-center p-4">
      <div className="w-full max-w-sm md:max-w-md bg-brutal-white border-4 border-brutal-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 md:p-8">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Dirty Laundry" className="w-48 h-auto" />
        </div>

        {showAbout ? (
          <div className="space-y-4">
            <div className="bg-brutal-yellow/30 border-2 border-brutal-black p-4">
              <h2 className="font-mono font-bold text-sm mb-3">WHAT'S THIS ABOUT?</h2>
              <p className="font-mono text-xs text-brutal-black/80 leading-relaxed">
                Housework is boring. Nobody wants to do it.
                But <span className="font-bold">someone</span> has to.
              </p>
              <p className="font-mono text-xs text-brutal-black/80 leading-relaxed mt-2">
                Dirty Laundry turns your household chores into a game. Add chores, earn points,
                climb the leaderboard, and make the boring stuff a bit more fun.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3 p-2">
                <span className="bg-brutal-lime border-2 border-brutal-black w-8 h-8 flex items-center justify-center font-mono font-bold text-sm shrink-0">1</span>
                <p className="font-mono text-xs text-brutal-black/70 pt-1">Create a group and invite your partner, housemates, whoever</p>
              </div>
              <div className="flex items-start gap-3 p-2">
                <span className="bg-brutal-pink border-2 border-brutal-black w-8 h-8 flex items-center justify-center font-mono font-bold text-sm text-brutal-white shrink-0">2</span>
                <p className="font-mono text-xs text-brutal-black/70 pt-1">Add chores and assign point values — scrubbing the oven is worth more than wiping a counter</p>
              </div>
              <div className="flex items-start gap-3 p-2">
                <span className="bg-brutal-blue border-2 border-brutal-black w-8 h-8 flex items-center justify-center font-mono font-bold text-sm text-brutal-white shrink-0">3</span>
                <p className="font-mono text-xs text-brutal-black/70 pt-1">Complete chores, earn points, and climb the leaderboard. It's weirdly motivating</p>
              </div>
            </div>

            <Button
              onClick={() => setShowAbout(false)}
              className="w-full h-12 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
            >
              GET STARTED
            </Button>
          </div>
        ) : signedUp ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📬</div>
            <h2 className="font-mono font-bold text-lg mb-2">CHECK YOUR EMAIL</h2>
            <p className="font-mono text-sm text-brutal-black/60">
              We sent you a confirmation link. Click it to activate your account.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="signup">
            <TabsList className="w-full bg-brutal-black/5 border-2 border-brutal-black p-0 h-auto">
              <TabsTrigger
                value="login"
                className="flex-1 font-mono font-bold text-xs uppercase py-3 data-[state=active]:bg-brutal-black data-[state=active]:text-brutal-white rounded-none"
              >
                LOGIN
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="flex-1 font-mono font-bold text-xs uppercase py-3 data-[state=active]:bg-brutal-black data-[state=active]:text-brutal-white rounded-none"
              >
                SIGN UP
              </TabsTrigger>
            </TabsList>

            {error && (
              <div className="mt-4 bg-brutal-pink/20 border-2 border-brutal-pink p-3 font-mono text-xs font-bold">
                {error}
              </div>
            )}

            <TabsContent value="login">
              {showForgot ? (
                resetSent ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">📬</div>
                    <h2 className="font-mono font-bold text-lg mb-2">CHECK YOUR EMAIL</h2>
                    <p className="font-mono text-sm text-brutal-black/60">
                      We sent a password reset link to {forgotEmail}
                    </p>
                    <button
                      onClick={() => { setShowForgot(false); setResetSent(false); setError('') }}
                      className="font-mono text-xs font-bold text-brutal-blue mt-4 active:opacity-60"
                    >
                      BACK TO LOGIN
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-4 mt-4">
                    <p className="font-mono text-xs text-brutal-black/60">
                      Enter your email and we'll send you a reset link.
                    </p>
                    <div>
                      <label className="font-mono text-xs font-bold uppercase block mb-1">EMAIL</label>
                      <Input
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        className="border-2 border-brutal-black font-mono h-12"
                        required
                        autoFocus
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
                    >
                      {loading ? 'SENDING...' : 'SEND RESET LINK'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(false); setError('') }}
                      className="w-full font-mono text-xs font-bold text-brutal-black/50 active:opacity-60"
                    >
                      BACK TO LOGIN
                    </button>
                  </form>
                )
              ) : (
                <div className="mt-4">
                {appleButton}
                {orDivider}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="font-mono text-xs font-bold uppercase block mb-1">EMAIL</label>
                    <Input
                      type="email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      className="border-2 border-brutal-black font-mono h-12"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs font-bold uppercase block mb-1">PASSWORD</label>
                    <Input
                      type="password"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className="border-2 border-brutal-black font-mono h-12"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
                  >
                    {loading ? 'LOADING...' : 'LOG IN'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setForgotEmail(loginEmail); setError('') }}
                    className="w-full font-mono text-xs font-bold text-brutal-black/50 active:opacity-60"
                  >
                    FORGOT PASSWORD?
                  </button>
                </form>
                </div>
              )}
            </TabsContent>

            <TabsContent value="signup">
              {showAnon ? (
                <div className="mt-4">
                  <form
                    onSubmit={async e => {
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
                    <p className="font-mono text-xs text-brutal-black/50 text-center">Just enter your name to get started</p>
                    <Input
                      value={anonName}
                      onChange={e => setAnonName(e.target.value)}
                      placeholder="Your name"
                      className="border-2 border-brutal-black font-mono h-12 text-center"
                      autoFocus
                      required
                    />
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-brutal-lime font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
                    >
                      {loading ? 'JOINING...' : 'JOIN WITHOUT ACCOUNT'}
                    </Button>
                  </form>
                  <button
                    onClick={() => setShowAnon(false)}
                    className="w-full mt-3 font-mono text-xs font-bold text-brutal-black/40 py-2 active:text-brutal-black/60"
                  >
                    ← BACK TO SIGN UP
                  </button>
                </div>
              ) : (
              <>
              <div className="mt-4">
                {appleButton}
                {orDivider}
              </div>
              <form onSubmit={handleSignup} className="space-y-4 mt-4">
                <div>
                  <label className="font-mono text-xs font-bold uppercase block mb-1">DISPLAY NAME</label>
                  <Input
                    type="text"
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    className="border-2 border-brutal-black font-mono h-12"
                    required
                  />
                </div>
                <div>
                  <label className="font-mono text-xs font-bold uppercase block mb-1">EMAIL</label>
                  <Input
                    type="email"
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    className="border-2 border-brutal-black font-mono h-12"
                    required
                  />
                </div>
                <div>
                  <label className="font-mono text-xs font-bold uppercase block mb-1">PASSWORD</label>
                  <Input
                    type="password"
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    className="border-2 border-brutal-black font-mono h-12"
                    minLength={6}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-brutal-pink text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
                >
                  {loading ? 'LOADING...' : 'CREATE ACCOUNT'}
                </Button>
              </form>

              <div className="mt-4 pt-4 border-t-2 border-brutal-black/10">
                <button
                  onClick={() => setShowAnon(true)}
                  className="w-full font-mono text-xs font-bold text-brutal-black/40 py-2 active:text-brutal-black/60"
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

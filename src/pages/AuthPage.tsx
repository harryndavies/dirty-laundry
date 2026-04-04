import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function AuthPage() {
  const { session, signIn, signUp } = useAuth()
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupName, setSignupName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signedUp, setSignedUp] = useState(false)
  const [showAbout, setShowAbout] = useState(true)

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

  return (
    <div className="min-h-screen bg-brutal-yellow flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-brutal-white border-4 border-brutal-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
        <h1 className="font-mono text-3xl font-bold text-center mb-1 tracking-tight">
          DIRTY LAUNDRY
        </h1>
        <p className="text-center font-mono text-xs mb-6 text-brutal-black/60">
          AIRING IT OUT SINCE 2026
        </p>

        {showAbout ? (
          <div className="space-y-4">
            <div className="bg-brutal-yellow/30 border-2 border-brutal-black p-4">
              <h2 className="font-mono font-bold text-sm mb-3">WHAT'S THIS ABOUT?</h2>
              <p className="font-mono text-xs text-brutal-black/80 leading-relaxed">
                Let's be honest — nobody keeps a mental tally of who last cleaned the bathroom.
                But everyone <span className="font-bold">thinks</span> they do more.
              </p>
              <p className="font-mono text-xs text-brutal-black/80 leading-relaxed mt-2">
                Dirty Laundry settles it. Add your household chores, earn points when you do them,
                and let the leaderboard do the talking. No arguments, just receipts.
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
                <p className="font-mono text-xs text-brutal-black/70 pt-1">Mark chores as done, watch your score climb, and see who's actually pulling their weight</p>
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
          <Tabs defaultValue="login">
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
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
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
              </form>
            </TabsContent>

            <TabsContent value="signup">
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
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

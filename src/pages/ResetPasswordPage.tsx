import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    const { error } = await updatePassword(password)
    if (error) {
      setError(error)
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brutal-yellow p-4">
      <div className="w-full max-w-sm border-4 border-brutal-black bg-brutal-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h1 className="mb-1 text-center font-mono text-3xl font-bold tracking-tight">
          DIRTY LAUNDRY
        </h1>
        <p className="mb-6 text-center font-mono text-xs text-brutal-black/60">
          RESET YOUR PASSWORD
        </p>

        {done ? (
          <div className="py-8 text-center">
            <div className="mb-4 text-4xl">✓</div>
            <h2 className="mb-2 font-mono text-lg font-bold">PASSWORD UPDATED</h2>
            <p className="mb-4 font-mono text-sm text-brutal-black/60">You're all set.</p>
            <Button
              onClick={() => navigate('/chores')}
              className="h-12 w-full border-2 border-brutal-black bg-brutal-black font-mono text-sm font-bold text-brutal-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            >
              GO TO APP
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="border-2 border-brutal-pink bg-brutal-pink/20 p-3 font-mono text-xs font-bold">
                {error}
              </div>
            )}
            <div>
              <label className="mb-1 block font-mono text-xs font-bold uppercase">
                NEW PASSWORD
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 border-2 border-brutal-black font-mono"
                minLength={6}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-xs font-bold uppercase">
                CONFIRM PASSWORD
              </label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-12 border-2 border-brutal-black font-mono"
                minLength={6}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full border-2 border-brutal-black bg-brutal-black font-mono text-sm font-bold text-brutal-white uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
            >
              {loading ? 'UPDATING...' : 'SET NEW PASSWORD'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

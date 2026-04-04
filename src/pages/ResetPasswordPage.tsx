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
    <div className="min-h-screen bg-brutal-yellow flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-brutal-white border-4 border-brutal-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6">
        <h1 className="font-mono text-3xl font-bold text-center mb-1 tracking-tight">
          DIRTY LAUNDRY
        </h1>
        <p className="text-center font-mono text-xs mb-6 text-brutal-black/60">
          RESET YOUR PASSWORD
        </p>

        {done ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="font-mono font-bold text-lg mb-2">PASSWORD UPDATED</h2>
            <p className="font-mono text-sm text-brutal-black/60 mb-4">
              You're all set.
            </p>
            <Button
              onClick={() => navigate('/chores')}
              className="w-full h-12 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
            >
              GO TO APP
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-brutal-pink/20 border-2 border-brutal-pink p-3 font-mono text-xs font-bold">
                {error}
              </div>
            )}
            <div>
              <label className="font-mono text-xs font-bold uppercase block mb-1">NEW PASSWORD</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="border-2 border-brutal-black font-mono h-12"
                minLength={6}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="font-mono text-xs font-bold uppercase block mb-1">CONFIRM PASSWORD</label>
              <Input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="border-2 border-brutal-black font-mono h-12"
                minLength={6}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-brutal-black text-brutal-white font-mono font-bold uppercase text-sm border-2 border-brutal-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all"
            >
              {loading ? 'UPDATING...' : 'SET NEW PASSWORD'}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}

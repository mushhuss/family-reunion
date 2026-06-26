// Admin login page — validates password against the Worker's ADMIN_SECRET via POST /admin/check.
// On success, stores the raw password in sessionStorage as 'adminToken' so AdminDashboard
// can attach it as a Bearer token on every admin API call. Auth lives only in sessionStorage
// (cleared when the tab closes); the correct password never reaches the browser in any response.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Loader2 } from 'lucide-react'
import { checkAdmin } from '../../lib/api'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(false)
    try {
      await checkAdmin(password)
      sessionStorage.setItem('adminToken', password)
      navigate('/admin/dashboard')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-reunion-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-reunion-100">
            <Lock className="h-6 w-6 text-reunion-600" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Admin Access</h1>
          <p className="text-center text-sm text-gray-500">Enter the admin password to manage reunion content</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false) }}
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-reunion-400"
            autoFocus
          />
          {error && <p className="text-sm text-red-500">Incorrect password.</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-reunion-600 py-3 text-sm font-semibold text-white hover:bg-reunion-700 disabled:opacity-50 transition-colors"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}

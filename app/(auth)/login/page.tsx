'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

type Mode = 'signin' | 'signup' | 'magic'

const DEMO_EMAIL = 'demo@webfirm.dev'
const DEMO_PASSWORD = 'demo1234'
const IS_DEV = process.env.NODE_ENV !== 'production'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [mode, setMode] = useState<Mode>('signin')

  const supabase = createClient()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) { toast.error('Full name is required'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Account created — check your email to confirm, then sign in.')
      setMode('signin')
      setPassword('')
      setFullName('')
    }
    setLoading(false)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      toast.error(error.message)
    } else {
      setMagicLinkSent(true)
    }
    setLoading(false)
  }

  async function handleDemoLogin() {
    setDemoLoading(true)
    try {
      // Provision / reset demo credentials
      const res = await fetch('/api/setup-demo', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(body.error ?? `Setup failed (${res.status})`)
        return
      }

      // Sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      })
      if (error) {
        toast.error(`Sign-in failed: ${error.message}`)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      toast.error(`Unexpected error: ${String(err)}`)
    } finally {
      setDemoLoading(false)
    }
  }

  const titles: Record<Mode, string> = {
    signin: 'Sign in to your account',
    signup: 'Create your account',
    magic: 'Sign in with magic link',
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg mb-3">
            W
          </div>
          <h1 className="text-xl font-semibold text-foreground">Web Firm CRM</h1>
          <p className="mt-1 text-sm text-muted-foreground">{titles[mode]}</p>
        </div>

        {/* Dev-only demo credentials banner */}
        {IS_DEV && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="font-semibold text-amber-800 dark:text-amber-400 mb-2">
              🧪 Development — demo account
            </p>
            <div className="space-y-0.5 font-mono text-xs text-amber-700 dark:text-amber-500">
              <p>email &nbsp;&nbsp; {DEMO_EMAIL}</p>
              <p>password {DEMO_PASSWORD}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 w-full border-amber-300 bg-amber-100 hover:bg-amber-200 text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50"
              onClick={handleDemoLogin}
              disabled={demoLoading}
            >
              {demoLoading ? 'Setting up…' : 'Sign in as demo user'}
            </Button>
          </div>
        )}

        <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-6">
          {magicLinkSent ? (
            <div className="text-center py-4">
              <div className="mb-3 text-2xl">📬</div>
              <p className="font-medium text-foreground">Check your email</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We sent a sign-in link to <strong>{email}</strong>
              </p>
              <Button variant="ghost" className="mt-4" onClick={() => setMagicLinkSent(false)}>
                Try again
              </Button>
            </div>
          ) : mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          ) : mode === 'signup' ? (
            <form onSubmit={handleSignUp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email-signup">Email</Label>
                <Input
                  id="email-signup"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password-signup">Password</Label>
                <Input
                  id="password-signup"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email-magic">Email</Label>
                <Input
                  id="email-magic"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send magic link'}
              </Button>
            </form>
          )}

          {!magicLinkSent && (
            <div className="mt-4 flex flex-col items-center gap-1.5 text-sm text-muted-foreground">
              {mode === 'signin' && (
                <>
                  <button type="button" onClick={() => setMode('signup')} className="hover:text-foreground transition-colors">
                    Don't have an account? Sign up
                  </button>
                  <button type="button" onClick={() => setMode('magic')} className="hover:text-foreground transition-colors">
                    Sign in with magic link
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <button type="button" onClick={() => setMode('signin')} className="hover:text-foreground transition-colors">
                  Already have an account? Sign in
                </button>
              )}
              {mode === 'magic' && (
                <button type="button" onClick={() => setMode('signin')} className="hover:text-foreground transition-colors">
                  Sign in with password instead
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

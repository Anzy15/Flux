import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signInWithEmail, registerWithEmail, resetPassword } = useAuth()
  const navigate = useNavigate()

  const [mode,     setMode]     = useState('login') // 'login' | 'register' | 'reset'
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [name,     setName]     = useState('')
  const [error,    setError]    = useState('')
  const [info,     setInfo]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)

  function switchMode(next) {
    setMode(next)
    setError('')
    setInfo('')
  }

  // Maps Firebase auth error codes → friendly messages
  const AUTH_ERRORS = {
    'auth/invalid-api-key':          'Firebase API key is invalid. Please contact support.',
    'auth/email-already-in-use':     'An account with this email already exists.',
    'auth/invalid-email':            'Please enter a valid email address.',
    'auth/weak-password':            'Password must be at least 6 characters.',
    'auth/user-not-found':           'No account found with this email.',
    'auth/wrong-password':           'Incorrect password. Try again or reset it.',
    'auth/invalid-credential':       'Incorrect email or password.',
    'auth/too-many-requests':        'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed':   'Network error. Check your connection and try again.',
    'auth/operation-not-allowed':    'Email/Password sign-in is not enabled. Contact support.',
    'auth/user-disabled':            'This account has been disabled.',
    'auth/requires-recent-login':    'Please sign out and sign back in to continue.',
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password)
        navigate('/')
      } else if (mode === 'register') {
        await registerWithEmail(email, password, name)
        navigate('/')
      } else {
        await resetPassword(email)
        setInfo('Password reset email sent! Check your inbox.')
      }
    } catch (err) {
      // Extract the auth error code from the Firebase error (e.g. "auth/invalid-email")
      const code  = err.code || ''
      const friendly = AUTH_ERRORS[code]
      if (friendly) {
        setError(friendly)
      } else {
        // Fallback: clean up the raw Firebase message
        const raw = (err.message || 'Something went wrong.')
          .replace('Firebase: ', '')
          .replace(/\s*\(auth\/[^)]+\)\.?/, '')
          .trim()
        setError(raw || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-surface flex">

      {/* ── Left panel: Branding ── */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-14 bg-surface-container-low relative overflow-hidden">
        {/* Ambient glow orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] primary-gradient rounded-full blur-3xl opacity-[0.06] animate-pulse-glow pointer-events-none" />

        {/* Logo */}
        <div>
          <span className="text-3xl font-headline font-bold text-gradient tracking-tight">Flux</span>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-headline font-bold leading-tight tracking-tight text-on-surface mb-6">
            Ignite Your<br />
            <span className="text-gradient">Intelligence.</span>
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed mb-10">
            Transform static documents into dynamic study ecosystems. Upload your PDFs and let the Loom weave your mastery path.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            {[
              { icon: 'auto_awesome', label: 'Gemini Powered AI' },
              { icon: 'style',        label: 'AI Flashcards' },
              { icon: 'quiz',         label: 'Smart Quizzes' },
              { icon: 'trending_up',  label: 'Progress Tracking' },
            ].map(f => (
              <span key={f.label} className="flex items-center gap-2 bg-surface-container px-4 py-2 rounded-full text-sm font-medium text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-sm">{f.icon}</span>
                {f.label}
              </span>
            ))}
          </div>
        </div>

        <p className="text-xs text-on-surface-variant/30">© {new Date().getFullYear()} Flux. All rights reserved.</p>
      </div>

      {/* ── Right panel: Auth form ── */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface">
        <div className="w-full max-w-sm animate-slide-up">

          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <span className="text-3xl font-headline font-bold text-gradient tracking-tight">Flux</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-headline font-bold text-on-surface mb-1">
              {mode === 'login'    ? 'Welcome back'         :
               mode === 'register' ? 'Create your account'  :
                                     'Reset your password'}
            </h2>
            <p className="text-on-surface-variant text-sm">
              {mode === 'login' ? (
                <>No account?{' '}
                  <button onClick={() => switchMode('register')} className="text-primary hover:underline font-semibold">
                    Sign up for free
                  </button>
                </>
              ) : mode === 'register' ? (
                <>Already have an account?{' '}
                  <button onClick={() => switchMode('login')} className="text-primary hover:underline font-semibold">
                    Sign in
                  </button>
                </>
              ) : (
                <>Enter your email and we'll send a link.</>
              )}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Display name — register only */}
            {mode === 'register' && (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                  autoComplete="name"
                  className="flux-input"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="flux-input"
              />
            </div>

            {/* Password */}
            {mode !== 'reset' && (
              <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="flux-input pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors text-xl"
                  >
                    {showPass ? 'visibility_off' : 'visibility'}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm password — register only */}
            {mode === 'register' && (
              <div className="animate-fade-in">
                <label className="block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="flux-input"
                />
              </div>
            )}

            {/* Error / info banners */}
            {error && (
              <div className="bg-error-container/20 text-error text-sm px-4 py-3 rounded-md flex items-start gap-2 animate-fade-in">
                <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">error</span>
                {error}
              </div>
            )}
            {info && (
              <div className="bg-tertiary-fixed/10 text-tertiary-fixed-dim text-sm px-4 py-3 rounded-md flex items-start gap-2 animate-fade-in">
                <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">check_circle</span>
                {info}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-1 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">
                    {mode === 'login' ? 'login' : mode === 'register' ? 'person_add' : 'send'}
                  </span>
                  {mode === 'login'    ? 'Sign In'          :
                   mode === 'register' ? 'Create Account'   :
                                         'Send Reset Email'}
                </>
              )}
            </button>

            {/* Back link for reset mode */}
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="btn-ghost w-full flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Back to Sign In
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

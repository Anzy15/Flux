import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
  const { currentUser, updateUserProfile, resetPassword, signOut } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '')
  const [saving,      setSaving]      = useState(false)
  const [saveMsg,     setSaveMsg]     = useState('')
  const [saveErr,     setSaveErr]     = useState('')

  const [resetSent,   setResetSent]   = useState(false)
  const [resetErr,    setResetErr]    = useState('')

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!displayName.trim()) return
    setSaving(true)
    setSaveMsg('')
    setSaveErr('')
    try {
      await updateUserProfile(displayName.trim(), undefined)
      setSaveMsg('Profile updated successfully!')
    } catch (err) {
      setSaveErr(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordReset() {
    setResetErr('')
    try {
      await resetPassword(currentUser.email)
      setResetSent(true)
    } catch (err) {
      setResetErr(err.message)
    }
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-on-surface mb-1">Settings</h1>
        <div className="h-1 w-10 primary-gradient mt-2 rounded-full" />
      </div>

      {/* ── Profile Section ── */}
      <section className="bg-surface-container-low rounded-2xl p-8 mb-6">
        <h2 className="text-lg font-headline font-bold text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">person</span>
          Profile Information
        </h2>

        {/* Avatar */}
        <div className="flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-outline-variant/20">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-container-highest text-primary font-bold text-2xl">
                {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <p className="font-headline font-bold text-on-surface">{currentUser?.displayName || 'User'}</p>
            <p className="text-on-surface-variant text-sm">{currentUser?.email}</p>
            {currentUser?.providerData?.[0]?.providerId === 'password' && (
              <span className="mastery-badge bg-surface-container text-on-surface-variant mt-1 inline-flex">
                Email Account
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your display name"
              className="flux-input"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-on-surface-variant mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              value={currentUser?.email || ''}
              disabled
              className="flux-input opacity-50 cursor-not-allowed"
            />
            <p className="text-xs text-on-surface-variant mt-1.5">Email cannot be changed here.</p>
          </div>

          {saveMsg && (
            <div className="bg-tertiary-fixed/10 text-tertiary-fixed-dim text-sm px-4 py-3 rounded-md flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {saveMsg}
            </div>
          )}
          {saveErr && (
            <div className="bg-error-container/20 text-error text-sm px-4 py-3 rounded-md flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {saveErr}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !displayName.trim()}
            className="btn-primary self-start flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-base">save</span>
            )}
            Save Changes
          </button>
        </form>
      </section>

      {/* ── Security Section ── */}
      <section className="bg-surface-container-low rounded-2xl p-8 mb-6">
        <h2 className="text-lg font-headline font-bold text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">lock</span>
          Security
        </h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-medium text-on-surface">Password</p>
            <p className="text-sm text-on-surface-variant">
              Send a password reset link to your email address.
            </p>
          </div>

          <div className="shrink-0">
            {resetSent ? (
              <div className="flex items-center gap-2 text-tertiary-fixed-dim text-sm font-medium">
                <span className="material-symbols-outlined text-base">check_circle</span>
                Reset email sent!
              </div>
            ) : (
              <button onClick={handlePasswordReset} className="btn-secondary text-sm px-4 py-2.5">
                Send Reset Email
              </button>
            )}
            {resetErr && <p className="text-error text-xs mt-1">{resetErr}</p>}
          </div>
        </div>
      </section>

      {/* ── Account Section ── */}
      <section className="bg-surface-container-low rounded-2xl p-8">
        <h2 className="text-lg font-headline font-bold text-on-surface mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-error">manage_accounts</span>
          Account
        </h2>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-medium text-on-surface">Sign Out</p>
            <p className="text-sm text-on-surface-variant">Sign out of your Flux account on this device.</p>
          </div>
          <button
            onClick={handleSignOut}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-md bg-error-container/20 text-error hover:bg-error-container/30 transition-colors font-bold text-sm"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Sign Out
          </button>
        </div>
      </section>
    </div>
  )
}

import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../services/firebase'
import {
  registerWithEmail,
  signInWithEmail,
  signOut,
  resetPassword,
  updateUserProfile,
} from '../services/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    let settled = false

    // Safety timeout — if Firebase doesn't respond in 8s (missing config), unblock the UI
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        setLoading(false)
      }
    }, 8000)

    let unsubscribe = () => {}
    try {
      unsubscribe = onAuthStateChanged(auth, user => {
        if (!settled) settled = true
        clearTimeout(timer)
        setCurrentUser(user)
        setLoading(false)
      }, () => {
        // Auth error (e.g. bad API key) — still unblock UI
        if (!settled) settled = true
        clearTimeout(timer)
        setLoading(false)
      })
    } catch {
      clearTimeout(timer)
      setLoading(false)
    }

    return () => { unsubscribe(); clearTimeout(timer) }
  }, [])

  const value = {
    currentUser,
    loading,
    registerWithEmail,
    signInWithEmail,
    signOut,
    resetPassword,
    updateUserProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-surface-container-highest border-t-primary animate-spin" />
              <div className="absolute inset-0 primary-gradient rounded-full blur-xl opacity-20 animate-pulse-glow" />
            </div>
            <span className="text-2xl font-headline font-bold text-gradient">Flux</span>
          </div>
        </div>
      ) : children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

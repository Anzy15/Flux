import { useState, useEffect } from 'react'
import { getUserStudySets, getRecentStudySets } from '../services/firestore'
import { useAuth } from '../context/AuthContext'

export function useStudySets(mode = 'all') {
  const { currentUser } = useAuth()
  const [sets,    setSets]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  async function refresh() {
    if (!currentUser) return
    setLoading(true)
    try {
      const data = mode === 'recent'
        ? await getRecentStudySets(currentUser.uid)
        : await getUserStudySets(currentUser.uid)
      setSets(data)
    } catch (e) {
      setError(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [currentUser, mode])

  return { sets, loading, error, refresh }
}

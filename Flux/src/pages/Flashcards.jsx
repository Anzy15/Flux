import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getStudySet, saveFlashcardSession, updateStudySetItems } from '../services/firestore'
import { generateFlashcards } from '../services/groq'

const STATES = { LOADING: 0, READY: 1, SESSION: 2, SUMMARY: 3, REVIEW: 4, REGENERATING: 5 }

export default function Flashcards() {
  const { setId }       = useParams()
  const { currentUser } = useAuth()
  const navigate         = useNavigate()
  const [searchParams]   = useSearchParams()

  const [studySet, setStudySet] = useState(null)
  const [state,    setState]    = useState(STATES.LOADING)
  const [idx,      setIdx]      = useState(0)
  const [flipped,  setFlipped]  = useState(false)
  const [results,  setResults]  = useState([]) // 'know' | 'learning'
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    getStudySet(setId).then(data => {
      if (!data || data.type !== 'flashcard') { navigate('/library'); return }
      setStudySet(data)
      if (searchParams.get('mode') === 'review') {
        setState(STATES.REVIEW)
      } else {
        setState(STATES.READY)
      }
    })
  }, [setId])

  // Keyboard shortcuts
  const handleKey = useCallback((e) => {
    if (state !== STATES.SESSION) return
    if (e.code === 'Space') { e.preventDefault(); setFlipped(f => !f) }
    if (e.code === 'ArrowRight' && flipped) markCard('know')
    if (e.code === 'ArrowLeft'  && flipped) markCard('learning')
  }, [state, flipped, idx])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  function startSession() {
    setIdx(0)
    setFlipped(false)
    setResults([])
    setState(STATES.SESSION)
  }

  async function handleRegenerate() {
    if (!studySet?.sourceText) return
    setState(STATES.REGENERATING)
    try {
      const quantity = studySet.items.length || 20
      const newItems = await generateFlashcards(studySet.sourceText, studySet.title, quantity, true)
      await updateStudySetItems(setId, newItems)
      setStudySet(prev => ({ ...prev, items: newItems }))
      startSession()
    } catch (err) {
      console.error('Failed to regenerate:', err)
      alert('Failed to generate new flashcards. Please try again.')
      setState(STATES.READY)
    }
  }

  function markCard(result) {
    const newResults = [...results, result]
    setResults(newResults)
    setFlipped(false)

    setTimeout(() => {
      if (idx + 1 >= studySet.items.length) {
        finishSession(newResults)
      } else {
        setIdx(i => i + 1)
      }
    }, 180)
  }

  async function finishSession(finalResults) {
    setSaving(true)
    const known   = finalResults.filter(r => r === 'know').length
    const unknown = finalResults.filter(r => r === 'learning').length
    await saveFlashcardSession(currentUser.uid, setId, { known, unknown })
    setSaving(false)
    setState(STATES.SUMMARY)
  }

  if (state === STATES.LOADING || state === STATES.REGENERATING) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="w-10 h-10 border-4 border-surface-container border-t-primary rounded-full animate-spin mb-4" />
        {state === STATES.REGENERATING && <p className="text-on-surface-variant text-sm">Generating new cards...</p>}
      </div>
    )
  }

  const cards   = studySet?.items || []
  const card    = cards[idx]
  const known   = results.filter(r => r === 'know').length
  const unknown = results.filter(r => r === 'learning').length
  const mastery = cards.length > 0 ? Math.round((results.filter(r => r === 'know').length / cards.length) * 100) : 0
  const progress = cards.length > 0 ? ((idx) / cards.length) * 100 : 0

  // ── READY state ──
  if (state === STATES.READY) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Link to="/library" className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface text-sm mb-8 transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Library
        </Link>

        <div className="bg-surface-container-low rounded-2xl p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-surface-container-highest flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl text-primary">style</span>
          </div>
          <span className="mastery-badge bg-secondary-container text-on-secondary-container mb-4 inline-flex">
            Flashcard Deck
          </span>
          <h1 className="text-3xl font-headline font-bold text-on-surface mt-3 mb-2">{studySet.title}</h1>
          <p className="text-on-surface-variant mb-1">From: {studySet.sourceFileName}</p>
          <p className="text-on-surface-variant mb-8">{cards.length} cards total</p>

          <div className="grid grid-cols-2 gap-4 mb-8 text-left">
            <div className="bg-surface-container rounded-xl p-5">
              <p className="text-xs text-on-surface-variant mb-1">Previous Mastery</p>
              <p className="text-2xl font-headline font-bold text-on-surface">{studySet.masteryPercent || 0}%</p>
            </div>
            <div className="bg-surface-container rounded-xl p-5">
              <p className="text-xs text-on-surface-variant mb-1">Total Cards</p>
              <p className="text-2xl font-headline font-bold text-on-surface">{cards.length}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setState(STATES.REVIEW)} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base">visibility</span>
              Review Deck
            </button>
            <button onClick={startSession} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">play_arrow</span>
              Start Session
            </button>
          </div>

          <p className="text-xs text-on-surface-variant mt-4">
            Tip: Press <kbd className="bg-surface-container px-1.5 py-0.5 rounded text-on-surface">Space</kbd> to flip,{' '}
            <kbd className="bg-surface-container px-1.5 py-0.5 rounded text-on-surface">→</kbd> I know it,{' '}
            <kbd className="bg-surface-container px-1.5 py-0.5 rounded text-on-surface">←</kbd> Still learning
          </p>

          {studySet?.sourceText && studySet.masteryPercent > 0 && (
            <button onClick={handleRegenerate} className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-high text-primary font-bold hover:bg-primary-container/10 transition-colors">
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              Retake with New Cards
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── REVIEW state ──
  if (state === STATES.REVIEW) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setState(STATES.READY)} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors flex-shrink-0">
            arrow_back
          </button>
          <h2 className="text-xl font-headline font-bold text-on-surface truncate">Review Deck: {studySet.title}</h2>
        </div>
        
        <div className="grid gap-4">
          {cards.map((c, i) => (
            <div key={i} className="bg-surface-container-low rounded-xl p-6">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Card {i + 1}</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-surface-container p-4 rounded-lg">
                  <p className="text-xs text-on-surface-variant mb-1 uppercase tracking-widest font-bold font-headline">Front</p>
                  <p className="font-medium text-on-surface">{c.front}</p>
                </div>
                <div className="bg-surface-container p-4 rounded-lg border-t-2 sm:border-t-0 sm:border-l-2 border-primary/20">
                  <p className="text-xs text-primary mb-1 uppercase tracking-widest font-bold font-headline">Back</p>
                  <p className="font-medium text-on-surface">{c.back}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── SESSION state ──
  if (state === STATES.SESSION) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Progress bar */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setState(STATES.READY)} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors">
            close
          </button>
          <div className="flex-1 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full primary-gradient rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-bold text-on-surface-variant shrink-0">{idx + 1} / {cards.length}</span>
        </div>

        <p className="text-center text-xs text-on-surface-variant mb-6">
          {flipped ? 'How well did you know this?' : 'Click the card to reveal the answer'}
        </p>

        {/* Card flip */}
        <div className="card-scene h-72 mb-8 cursor-pointer" onClick={() => setFlipped(f => !f)}>
          <div className={`card-inner ${flipped ? 'flipped' : ''}`}>
            {/* Front */}
            <div className="card-face bg-surface-container flex flex-col items-center justify-center p-10 text-center">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Question</p>
              <p className="text-2xl font-headline font-bold text-on-surface leading-snug">{card?.front}</p>
              <p className="text-xs text-on-surface-variant mt-6 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">touch_app</span>
                Tap to reveal
              </p>
            </div>
            {/* Back */}
            <div className="card-back card-face bg-surface-container-high flex flex-col items-center justify-center p-10 text-center">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Answer</p>
              <p className="text-xl font-body text-on-surface leading-relaxed">{card?.back}</p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {flipped && (
          <div className="grid grid-cols-2 gap-4 animate-fade-in">
            <button
              onClick={() => markCard('learning')}
              className="flex items-center justify-center gap-2 py-4 rounded-xl bg-error-container/20 text-error hover:bg-error-container/30 transition-colors font-bold font-headline"
            >
              <span className="material-symbols-outlined">close</span>
              Still Learning
            </button>
            <button
              onClick={() => markCard('know')}
              className="flex items-center justify-center gap-2 py-4 rounded-xl bg-tertiary-fixed/10 text-tertiary-fixed-dim hover:bg-tertiary-fixed/20 transition-colors font-bold font-headline"
            >
              <span className="material-symbols-outlined">check</span>
              I Know It!
            </button>
          </div>
        )}

        {/* Running stats */}
        <div className="flex justify-center gap-8 mt-6 text-sm">
          <span className="text-tertiary-fixed-dim font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">check</span>
            {results.filter(r => r === 'know').length} Known
          </span>
          <span className="text-error font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">close</span>
            {results.filter(r => r === 'learning').length} Still Learning
          </span>
        </div>
      </div>
    )
  }

  // ── SUMMARY state ──
  if (state === STATES.SUMMARY) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-surface-container-low rounded-2xl p-10 text-center">
          {/* Mastery ring */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            <div className="absolute inset-0 primary-gradient rounded-full blur-2xl opacity-20 animate-pulse-glow" />
            <div className="relative w-full h-full rounded-full bg-surface-container-highest flex flex-col items-center justify-center border-4 border-primary/30">
              <span className="text-3xl font-headline font-bold text-gradient">{mastery}%</span>
              <span className="text-xs text-on-surface-variant">Mastery</span>
            </div>
          </div>

          <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">Session Complete!</h2>
          <p className="text-on-surface-variant mb-8">Here's how you did on <span className="text-on-surface font-medium">{studySet.title}</span></p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-surface-container rounded-xl p-4">
              <p className="text-xs text-on-surface-variant mb-1">Total Cards</p>
              <p className="text-2xl font-headline font-bold text-on-surface">{cards.length}</p>
            </div>
            <div className="bg-tertiary-fixed/10 rounded-xl p-4">
              <p className="text-xs text-tertiary-fixed-dim mb-1">Known</p>
              <p className="text-2xl font-headline font-bold text-tertiary-fixed-dim">{known}</p>
            </div>
            <div className="bg-error-container/20 rounded-xl p-4">
              <p className="text-xs text-error mb-1">Still Learning</p>
              <p className="text-2xl font-headline font-bold text-error">{unknown}</p>
            </div>
          </div>

          {saving ? (
            <div className="flex items-center justify-center gap-2 text-on-surface-variant mb-6">
              <span className="w-4 h-4 border-2 border-on-surface-variant/30 border-t-on-surface-variant rounded-full animate-spin" />
              Saving your progress…
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant mb-6">✓ Progress saved to your account</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={startSession} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base">refresh</span>
              Review Again
            </button>
            <Link to="/library" className="btn-primary flex-1 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base">library_books</span>
              Back to Library
            </Link>
          </div>

          {studySet?.sourceText && (
            <button onClick={handleRegenerate} className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-high text-primary font-bold hover:bg-primary-container/10 transition-colors">
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              Retake with New Cards
            </button>
          )}
        </div>
      </div>
    )
  }
}

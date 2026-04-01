import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { extractTextFromPDF } from '../services/pdfParser'
import { generateFlashcards, generateQuiz } from '../services/groq'
import { createStudySet } from '../services/firestore'
import Modal from './ui/Modal'

const STEPS = { TYPE: 0, FORMAT: 1, GENERATING: 2, DONE: 3, ERROR: 4 }

const TYPE_OPTIONS = [
  {
    id:    'flashcard',
    icon:  'style',
    label: 'Flashcard Deck',
    desc:  'Classic front/back cards for active recall and memorization.',
    badge: 'bg-secondary-container text-on-secondary-container',
  },
  {
    id:    'quiz',
    icon:  'quiz',
    label: 'Quiz',
    desc:  'Test your understanding with AI-generated questions.',
    badge: 'bg-primary-container/10 text-primary',
  },
]

const FORMAT_OPTIONS = [
  { id: 'multiple-choice', icon: 'checklist',    label: 'Multiple Choice', desc: 'Four options — one correct answer.' },
  { id: 'true-false',      icon: 'toggle_on',    label: 'True / False',    desc: 'Quick binary questions for fast review.' },
  { id: 'mix',             icon: 'shuffle',      label: 'Mix',             desc: 'A blend of multiple choice and true/false.' },
]

const STATUS_MESSAGES = [
  'Extracting text from your PDF…',
  'Weaving through the content…',
  'The Loom is generating your study set…',
  'Polishing the results…',
]

export default function ConvertModal({ open, file, onClose }) {
  const { currentUser } = useAuth()
  const navigate         = useNavigate()

  const [step,        setStep]        = useState(STEPS.TYPE)
  const [type,        setType]        = useState(null)
  const [format,      setFormat]      = useState(null)
  const [statusIdx,   setStatusIdx]   = useState(0)
  const [errorMsg,    setErrorMsg]    = useState('')
  const [newSetId,    setNewSetId]    = useState(null)
  const [cooldown,    setCooldown]    = useState(0)
  const [quantity,    setQuantity]    = useState(20)

  useEffect(() => {
    const timer = setInterval(() => {
      const lastGen = parseInt(localStorage.getItem('flux_last_gen') || '0', 10)
      const diff = Math.floor((Date.now() - lastGen) / 1000)
      if (diff < 20) {
        setCooldown(20 - diff)
      } else {
        setCooldown(0)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  function handleClose() {
    setStep(STEPS.TYPE)
    setType(null)
    setFormat(null)
    setStatusIdx(0)
    setErrorMsg('')
    setNewSetId(null)
    onClose()
  }

  async function startGeneration() {
    if (cooldown > 0) return
    localStorage.setItem('flux_last_gen', Date.now().toString())
    setStep(STEPS.GENERATING)

    // rotate status messages
    const interval = setInterval(() => {
      setStatusIdx(i => (i + 1) % STATUS_MESSAGES.length)
    }, 2200)

    try {
      // Step 1: extract text
      const text  = await extractTextFromPDF(file)
      const title = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')

      // Step 2: generate content
      let items
      if (type === 'flashcard') {
        items = await generateFlashcards(text, title, quantity)
      } else {
        items = await generateQuiz(text, title, format, quantity)
      }

      // Step 3: save to Firestore
      const setId = await createStudySet(currentUser.uid, {
        title,
        sourceFileName: file.name,
        type,
        quizFormat: type === 'quiz' ? format : null,
        items,
      })

      clearInterval(interval)
      setNewSetId(setId)
      setStep(STEPS.DONE)
    } catch (err) {
      clearInterval(interval)
      console.error(err)
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
      setStep(STEPS.ERROR)
    }
  }

  function goToStudy() {
    handleClose()
    navigate(`/${type === 'flashcard' ? 'flashcards' : 'quiz'}/${newSetId}`)
  }

  return (
    <Modal open={open} onClose={step === STEPS.GENERATING ? undefined : handleClose} size="md">
      {/* ── STEP 0: Choose type ── */}
      {step === STEPS.TYPE && (
        <div className="animate-fade-in">
          <h2 className="text-2xl font-headline font-bold text-on-surface mb-1">
            Transform Your PDF
          </h2>
          <p className="text-on-surface-variant text-sm mb-6">
            <span className="text-primary font-medium">{file?.name}</span>
          </p>
          <p className="text-on-surface-variant mb-6">What would you like to create?</p>

          <div className="grid grid-cols-2 gap-4 mb-8">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setType(opt.id)}
                className={`flex flex-col items-start gap-3 p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                  type === opt.id
                    ? 'border-primary bg-surface-container-highest'
                    : 'border-outline-variant/20 bg-surface-container-high hover:border-outline-variant/50'
                }`}
              >
                <span className={`material-symbols-outlined text-2xl ${type === opt.id ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {opt.icon}
                </span>
                <div>
                  <p className={`font-headline font-bold mb-1 ${type === opt.id ? 'text-primary' : 'text-on-surface'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 mb-8 bg-surface-container-high p-4 rounded-xl border border-outline-variant/10">
            <div className="flex justify-between items-end mb-2">
              <label className="text-on-surface font-medium text-sm">Target Quantity</label>
              <span className="text-sm text-primary font-bold bg-primary/10 px-2 py-0.5 rounded">{quantity}</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="150" 
              step="5"
              value={quantity} 
              onChange={e => setQuantity(Number(e.target.value))} 
              className="w-full accent-primary cursor-pointer mb-2" 
            />
            <p className="text-xs text-on-surface-variant/80 leading-relaxed">
              Slide to set how many items to generate. If your PDF is already an exam or Q&A sheet, the AI will try to extract existing questions directly.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={handleClose} className="btn-ghost flex-1">Cancel</button>
            <button
              onClick={() => type === 'quiz' ? setStep(STEPS.FORMAT) : startGeneration()}
              disabled={!type || (type === 'flashcard' && cooldown > 0)}
              className="btn-primary flex-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {type === 'quiz' ? 'Next' : (cooldown > 0 ? `Wait ${cooldown}s` : 'Generate')}
              <span className="material-symbols-outlined text-base ml-2">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 1: Choose quiz format ── */}
      {step === STEPS.FORMAT && (
        <div className="animate-fade-in">
          <button onClick={() => setStep(STEPS.TYPE)} className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface text-sm mb-6 transition-colors">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back
          </button>
          <h2 className="text-2xl font-headline font-bold text-on-surface mb-1">Choose Quiz Format</h2>
          <p className="text-on-surface-variant mb-6">How should the questions be structured?</p>

          <div className="flex flex-col gap-3 mb-8">
            {FORMAT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setFormat(opt.id)}
                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  format === opt.id
                    ? 'border-primary bg-surface-container-highest'
                    : 'border-outline-variant/20 bg-surface-container-high hover:border-outline-variant/50'
                }`}
              >
                <span className={`material-symbols-outlined text-2xl ${format === opt.id ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {opt.icon}
                </span>
                <div>
                  <p className={`font-headline font-bold ${format === opt.id ? 'text-primary' : 'text-on-surface'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-on-surface-variant">{opt.desc}</p>
                </div>
                {format === opt.id && (
                  <span className="material-symbols-outlined text-primary ml-auto">check_circle</span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={startGeneration}
            disabled={!format || cooldown > 0}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            {cooldown > 0 ? `Wait (${cooldown}s)` : 'Generate Quiz'}
          </button>
        </div>
      )}

      {/* ── STEP 2: Generating ── */}
      {step === STEPS.GENERATING && (
        <div className="animate-fade-in flex flex-col items-center text-center py-6">
          {/* Spinner */}
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 primary-gradient rounded-full blur-xl opacity-30 animate-pulse-glow" />
            <div className="relative w-full h-full rounded-full border-4 border-surface-container-highest flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
              <span className="material-symbols-outlined text-primary text-3xl">auto_awesome</span>
            </div>
          </div>

          <h2 className="text-2xl font-headline font-bold text-on-surface mb-3">
            The Loom is Weaving…
          </h2>
          <p className="text-on-surface-variant text-sm transition-all duration-500 animate-fade-in" key={statusIdx}>
            {STATUS_MESSAGES[statusIdx]}
          </p>
          <p className="text-xs text-on-surface-variant/50 mt-4">This may take 15–30 seconds</p>
        </div>
      )}

      {/* ── STEP 3: Done ── */}
      {step === STEPS.DONE && (
        <div className="animate-fade-in flex flex-col items-center text-center py-6">
          <div className="w-20 h-20 rounded-full bg-tertiary-fixed/10 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-tertiary-fixed-dim">check_circle</span>
          </div>
          <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
            Your Study Set is Ready!
          </h2>
          <p className="text-on-surface-variant mb-8">
            {type === 'flashcard' ? 'Flashcard deck' : 'Quiz'} generated from your PDF.
          </p>
          <div className="flex gap-3 w-full">
            <button onClick={handleClose} className="btn-ghost flex-1">View Library</button>
            <button onClick={goToStudy} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base">play_arrow</span>
              Start Studying
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Error ── */}
      {step === STEPS.ERROR && (
        <div className="animate-fade-in flex flex-col items-center text-center py-6">
          <div className="w-20 h-20 rounded-full bg-error-container/30 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-error">error</span>
          </div>
          <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">Something Went Wrong</h2>
          <p className="text-on-surface-variant text-sm mb-2 max-w-sm">{errorMsg}</p>
          <p className="text-xs text-on-surface-variant/60 mb-8">Make sure your Groq API key is valid and the PDF contains readable text.</p>
          <div className="flex gap-3 w-full">
            <button onClick={handleClose} className="btn-ghost flex-1">Cancel</button>
            <button onClick={() => setStep(STEPS.TYPE)} className="btn-secondary flex-1">Try Again</button>
          </div>
        </div>
      )}
    </Modal>
  )
}

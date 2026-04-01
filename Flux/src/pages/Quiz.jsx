import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getStudySet, saveQuizAttempt, getQuizAttempts } from '../services/firestore'

const STATES = { LOADING: 0, READY: 1, QUIZ: 2, REVIEW: 3, SUMMARY: 4 }

export default function Quiz() {
  const { setId }       = useParams()
  const { currentUser } = useAuth()
  const navigate         = useNavigate()

  const [studySet,  setStudySet]  = useState(null)
  const [state,     setState]     = useState(STATES.LOADING)
  const [idx,       setIdx]       = useState(0)
  const [selected,  setSelected]  = useState(null)    // chosen option
  const [confirmed, setConfirmed] = useState(false)   // answered
  const [answers,   setAnswers]   = useState([])
  const [history,   setHistory]   = useState([])
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    async function load() {
      const data = await getStudySet(setId)
      if (!data || data.type !== 'quiz') { navigate('/library'); return }
      setStudySet(data)

      const h = await getQuizAttempts(currentUser.uid, setId)
      setHistory(h)
      setState(STATES.READY)
    }
    load()
  }, [setId])

  function startQuiz() {
    setIdx(0)
    setSelected(null)
    setConfirmed(false)
    setAnswers([])
    setState(STATES.QUIZ)
  }

  function handleSelect(opt) {
    if (confirmed) return
    setSelected(opt)
  }

  function handleConfirm() {
    if (!selected) return
    setConfirmed(true)
  }

  function handleNext() {
    const q       = studySet.items[idx]
    const correct = selected === q.answer
    const newAnswers = [...answers, { questionIndex: idx, chosen: selected, correct }]
    setAnswers(newAnswers)

    if (idx + 1 >= studySet.items.length) {
      finishQuiz(newAnswers)
    } else {
      setIdx(i => i + 1)
      setSelected(null)
      setConfirmed(false)
    }
  }

  async function finishQuiz(finalAnswers) {
    setSaving(true)
    const score = finalAnswers.filter(a => a.correct).length
    await saveQuizAttempt(currentUser.uid, setId, {
      score,
      total: studySet.items.length,
      answers: finalAnswers,
    })
    setSaving(false)
    setAnswers(finalAnswers)
    setState(STATES.SUMMARY)
  }

  if (state === STATES.LOADING) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-surface-container border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  const questions = studySet?.items || []
  const q         = questions[idx]
  const score     = answers.filter(a => a.correct).length
  const mastery   = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0
  const progress  = questions.length > 0 ? ((idx) / questions.length) * 100 : 0

  const formatLabel = {
    'multiple-choice': 'Multiple Choice',
    'true-false':      'True / False',
    'mix':             'Mixed Format',
  }[studySet?.quizFormat] || 'Quiz'

  // ── READY ──
  if (state === STATES.READY) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <Link to="/library" className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface text-sm mb-8 transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Library
        </Link>

        <div className="bg-surface-container-low rounded-2xl p-10">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-surface-container-highest flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-primary">quiz</span>
            </div>
            <span className="mastery-badge bg-primary-container/10 text-primary mb-4 inline-flex">
              {formatLabel}
            </span>
            <h1 className="text-3xl font-headline font-bold text-on-surface mt-3 mb-2">{studySet.title}</h1>
            <p className="text-on-surface-variant">{questions.length} questions · From: {studySet.sourceFileName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-surface-container rounded-xl p-5">
              <p className="text-xs text-on-surface-variant mb-1">Your Best Score</p>
              <p className="text-2xl font-headline font-bold text-on-surface">
                {history.length > 0 ? `${Math.max(...history.map(h => h.masteryPercent))}%` : '—'}
              </p>
            </div>
            <div className="bg-surface-container rounded-xl p-5">
              <p className="text-xs text-on-surface-variant mb-1">Attempts</p>
              <p className="text-2xl font-headline font-bold text-on-surface">{history.length}</p>
            </div>
          </div>

          {history.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Recent Attempts</p>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {history.slice(0, 5).map((h, i) => (
                  <div key={h.id} className="flex justify-between items-center bg-surface-container rounded-lg px-4 py-2.5">
                    <span className="text-xs text-on-surface-variant">Attempt #{history.length - i}</span>
                    <span className={`text-sm font-bold ${h.masteryPercent >= 70 ? 'text-tertiary-fixed-dim' : h.masteryPercent >= 50 ? 'text-primary' : 'text-error'}`}>
                      {h.score}/{h.total} · {h.masteryPercent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={startQuiz} className="btn-primary w-full flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">play_arrow</span>
            {history.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
          </button>
        </div>
      </div>
    )
  }

  // ── QUIZ ──
  if (state === STATES.QUIZ) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setState(STATES.READY)} className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors">
            close
          </button>
          <div className="flex-1 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full primary-gradient rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-bold text-on-surface-variant shrink-0">{idx + 1}/{questions.length}</span>
        </div>

        {/* Question */}
        <div className="bg-surface-container-low rounded-2xl p-8 mb-6">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">
            Question {idx + 1} · {q.type === 'true-false' ? 'True / False' : 'Multiple Choice'}
          </p>
          <p className="text-xl font-headline font-bold text-on-surface leading-snug">{q.question}</p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3 mb-6">
          {q.options.map((opt, i) => {
            let cls = 'answer-option flex items-center gap-3 p-4 rounded-xl border-2 border-outline-variant/20 bg-surface-container-high cursor-pointer'
            if (confirmed) {
              if (opt === q.answer)   cls += ' correct'
              else if (opt === selected) cls += ' incorrect'
              else                    cls += ' opacity-40'
            } else if (opt === selected) {
              cls += ' selected'
            } else {
              cls += ' hover:border-outline-variant/50 hover:bg-surface-container-highest'
            }

            return (
              <button key={i} onClick={() => handleSelect(opt)} className={cls}>
                <span className="w-7 h-7 rounded-full border-2 border-current flex items-center justify-center text-xs font-bold shrink-0">
                  {confirmed && opt === q.answer
                    ? <span className="material-symbols-outlined text-sm">check</span>
                    : confirmed && opt === selected && opt !== q.answer
                    ? <span className="material-symbols-outlined text-sm">close</span>
                    : String.fromCharCode(65 + i)}
                </span>
                <span className="font-medium text-left">{opt}</span>
              </button>
            )
          })}
        </div>

        {/* Confirm / Next */}
        {!confirmed ? (
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="btn-primary w-full disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Confirm Answer
          </button>
        ) : (
          <div className="animate-fade-in">
            <div className={`mb-4 px-5 py-4 rounded-xl flex items-start gap-3 ${selected === q.answer ? 'bg-tertiary-fixed/10' : 'bg-error-container/20'}`}>
              <span className={`material-symbols-outlined ${selected === q.answer ? 'text-tertiary-fixed-dim' : 'text-error'}`}>
                {selected === q.answer ? 'check_circle' : 'cancel'}
              </span>
              <div>
                <p className={`font-bold font-headline ${selected === q.answer ? 'text-tertiary-fixed-dim' : 'text-error'}`}>
                  {selected === q.answer ? 'Correct!' : 'Incorrect'}
                </p>
                {selected !== q.answer && (
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    Correct answer: <span className="text-on-surface font-medium">{q.answer}</span>
                  </p>
                )}
              </div>
            </div>
            <button onClick={handleNext} className="btn-primary w-full flex items-center justify-center gap-2">
              {idx + 1 >= questions.length ? 'See Results' : 'Next Question'}
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── SUMMARY ──
  if (state === STATES.SUMMARY) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-surface-container-low rounded-2xl p-10 text-center mb-6">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <div className="absolute inset-0 primary-gradient rounded-full blur-2xl opacity-20 animate-pulse-glow" />
            <div className="relative w-full h-full rounded-full bg-surface-container-highest flex flex-col items-center justify-center border-4 border-primary/30">
              <span className="text-3xl font-headline font-bold text-gradient">{mastery}%</span>
              <span className="text-xs text-on-surface-variant">{score}/{questions.length}</span>
            </div>
          </div>

          <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">
            {mastery >= 80 ? '🎉 Excellent Work!' : mastery >= 60 ? '👍 Good Effort!' : '📚 Keep Practicing!'}
          </h2>
          <p className="text-on-surface-variant mb-8">
            You scored <span className="text-on-surface font-bold">{score} out of {questions.length}</span> on this quiz.
          </p>

          {saving ? (
            <div className="flex items-center justify-center gap-2 text-on-surface-variant mb-6">
              <span className="w-4 h-4 border-2 border-on-surface-variant/30 border-t-on-surface-variant rounded-full animate-spin" />
              Saving attempt…
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant mb-6">✓ This attempt has been saved to your history</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={startQuiz} className="btn-secondary flex-1 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base">refresh</span>
              Retake Quiz
            </button>
            <Link to="/library" className="btn-primary flex-1 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-base">library_books</span>
              Back to Library
            </Link>
          </div>
        </div>

        {/* Answer review */}
        <div className="bg-surface-container-low rounded-2xl p-8">
          <h3 className="text-lg font-headline font-bold text-on-surface mb-6">Answer Review</h3>
          <div className="flex flex-col gap-4">
            {answers.map((ans, i) => {
              const question = questions[ans.questionIndex]
              return (
                <div key={i} className={`rounded-xl p-5 border-l-4 ${ans.correct ? 'border-tertiary-fixed-dim bg-tertiary-fixed/5' : 'border-error bg-error-container/10'}`}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1.5 ${ans.correct ? 'text-tertiary-fixed-dim' : 'text-error'}">
                    Q{i + 1} · {ans.correct ? 'Correct' : 'Incorrect'}
                  </p>
                  <p className="font-medium text-on-surface mb-2 text-sm">{question?.question}</p>
                  <p className="text-xs text-on-surface-variant">
                    Your answer: <span className={`font-medium ${ans.correct ? 'text-tertiary-fixed-dim' : 'text-error'}`}>{ans.chosen}</span>
                    {!ans.correct && <> · Correct: <span className="font-medium text-tertiary-fixed-dim">{question?.answer}</span></>}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }
}

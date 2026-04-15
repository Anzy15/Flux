import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { saveMockExamAttempt, getMockExamAttempts } from '../services/firestore';

// ─── State machine ────────────────────────────────────────────────────────────
const STATES = { LOADING: 0, READY: 1, PRE_EXAM: 2, EXAM: 3, SUMMARY: 4, REVIEW: 5, ERROR: 6 };

const EXAM_NAMES = {
  csa_exam: 'CSA Exam',
  cad_exam: 'CAD Exam',
};

// ─── Web Audio sound effects (no external files) ──────────────────────────────
function playCorrectSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Rising triad: C5 → E5 → G5
    [[523.25, 0], [659.25, 0.1], [783.99, 0.2]].forEach(([freq, delay]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.28, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.28);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.28);
    });
  } catch (_) { /* silently fail if AudioContext is blocked */ }
}

function playWrongSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Descending dissonant pair
    [[220, 0], [180, 0.16]].forEach(([freq, delay]) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.20, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.32);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.35);
    });
  } catch (_) { /* silently fail */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(ms) {
  if (!ms) return '—';
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const rem  = secs % 60;
  return mins > 0 ? `${mins}m ${rem}s` : `${secs}s`;
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function getMasteryColor(pct) {
  if (pct >= 70) return 'text-tertiary-fixed-dim';
  if (pct >= 50) return 'text-primary';
  return 'text-error';
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TakeMockExam() {
  const { examId }      = useParams();
  const navigate        = useNavigate();
  const { currentUser } = useAuth();

  const [isAdmin] = useState(
    currentUser?.email === import.meta.env.VITE_ADMIN_EMAIL ||
    import.meta.env.VITE_ADMIN_EMAIL === undefined
  );

  // ── Core data
  const [originalData, setOriginalData] = useState([]);
  const [state,        setState]        = useState(STATES.LOADING);
  const [history,      setHistory]      = useState([]);

  // ── Pre-exam config
  const [playerName,      setPlayerName]      = useState(() => localStorage.getItem('flux_exam_player_name') || '');
  const [questionCount,   setQuestionCount]   = useState('all');
  const [customCount,     setCustomCount]     = useState('');
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(true);

  // ── Active exam
  const [activeQuestions, setActiveQuestions] = useState([]);
  const [idx,             setIdx]             = useState(0);
  const [selected,        setSelected]        = useState([]);
  const [confirmed,       setConfirmed]       = useState(false);
  const [answers,         setAnswers]         = useState([]);
  const [liveCorrect,     setLiveCorrect]     = useState(0);
  const [liveWrong,       setLiveWrong]       = useState(0);
  const [flashState,      setFlashState]      = useState(null); // 'correct' | 'wrong' | null
  const [examStartTime,   setExamStartTime]   = useState(null);

  // ── Summary / Review
  const [saving,          setSaving]          = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [reviewData,      setReviewData]      = useState(null); // { answers, label, source }
  const [reviewIdx,       setReviewIdx]       = useState(0);

  // ── Load JSON + Firestore history on mount ────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    async function loadData() {
      try {
        const mod  = await import(`../data/${examId}.json`);
        const data = mod.default || mod;
        if (Array.isArray(data) && data.length > 0) {
          setOriginalData(data);
          const h = await getMockExamAttempts(currentUser.uid, examId);
          setHistory(h);
          setState(STATES.READY);
        } else {
          setState(STATES.ERROR);
        }
      } catch (err) {
        console.error('Failed to load exam data:', err);
        setState(STATES.ERROR);
      }
    }
    loadData();
  }, [examId, isAdmin]);

  // ─── Answer logic ─────────────────────────────────────────────────────────
  function getExpectedOptions(q) {
    if (q.type === 'identification' || !q.options || q.options.length === 0) {
      return Array.isArray(q.answer) ? q.answer : [q.answer];
    }
    if (Array.isArray(q.answer)) return q.answer;
    const raw   = (q.answer || '').toLowerCase();
    const match = q.options.filter(opt => raw.includes(opt.toLowerCase()));
    return match.length > 0 ? match : [q.answer];
  }

  function checkCorrect(q, sel) {
    if (q.type === 'identification' || !q.options || q.options.length === 0) {
      const normalize = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const actual    = Array.isArray(q.answer) ? q.answer[0] : q.answer;
      return normalize(sel[0]) === normalize(actual);
    }
    const expected = getExpectedOptions(q);
    return sel.length === expected.length && expected.every(e => sel.includes(e));
  }

  // ─── Flash helper ─────────────────────────────────────────────────────────
  function triggerFlash(type) {
    setFlashState(type);
    setTimeout(() => setFlashState(null), 700);
  }

  // ─── Start exam ───────────────────────────────────────────────────────────
  function startExam() {
    // Persist name for next time
    localStorage.setItem('flux_exam_player_name', playerName.trim());

    // Resolve count
    let count;
    if (questionCount === 'all') {
      count = originalData.length;
    } else if (questionCount === 'custom') {
      count = Math.min(Math.max(parseInt(customCount) || 1, 1), originalData.length);
    } else {
      count = Math.min(parseInt(questionCount), originalData.length);
    }

    // Shuffle then slice
    let pool = [...originalData];
    if (isShuffleEnabled) {
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    }

    setActiveQuestions(pool.slice(0, count));
    setIdx(0);
    setSelected([]);
    setConfirmed(false);
    setAnswers([]);
    setLiveCorrect(0);
    setLiveWrong(0);
    setExamStartTime(Date.now());
    setState(STATES.EXAM);
  }

  // ─── Exam interactions ────────────────────────────────────────────────────
  function handleSelect(opt) {
    if (confirmed) return;
    const q = activeQuestions[idx];
    if (q.type === 'identification' || !q.options || q.options.length === 0) {
      setSelected([opt]);
    } else {
      setSelected(prev =>
        prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
      );
    }
  }

  function handleConfirm() {
    if (!selected || selected.length === 0) return;
    const isCorrect = checkCorrect(activeQuestions[idx], selected);
    if (isCorrect) { playCorrectSound(); triggerFlash('correct'); }
    else           { playWrongSound();   triggerFlash('wrong');   }
    setConfirmed(true);
  }

  async function handleNext() {
    const q         = activeQuestions[idx];
    const isCorrect = checkCorrect(q, selected);

    const record = {
      questionIndex: idx,
      questionText:  q.question,
      options:       q.options || [],
      correctAnswer: getExpectedOptions(q),
      type:          q.type,
      chosen:        [...selected],
      correct:       isCorrect,
    };

    const newAnswers = [...answers, record];
    setAnswers(newAnswers);
    if (isCorrect) setLiveCorrect(c => c + 1);
    else           setLiveWrong(w => w + 1);

    if (idx + 1 >= activeQuestions.length) {
      await finishExam(newAnswers);
    } else {
      setIdx(i => i + 1);
      setSelected([]);
      setConfirmed(false);
    }
  }

  async function finishExam(finalAnswers) {
    setSaving(true);
    const score      = finalAnswers.filter(a => a.correct).length;
    const total      = activeQuestions.length;
    const durationMs = examStartTime ? Date.now() - examStartTime : 0;
    try {
      await saveMockExamAttempt(currentUser.uid, examId, {
        playerName: playerName.trim() || 'Anonymous',
        score, total, answers: finalAnswers, durationMs,
      });
      const h = await getMockExamAttempts(currentUser.uid, examId);
      setHistory(h);
    } catch (err) {
      console.error('Failed to save attempt:', err);
    }
    setSaving(false);
    setAnswers(finalAnswers);
    setState(STATES.SUMMARY);
  }

  // ─── Review helpers ───────────────────────────────────────────────────────
  function openReview(ans, label, source = 'summary') {
    setReviewData({ answers: ans, label, source });
    setReviewIdx(0);
    setState(STATES.REVIEW);
  }

  // ─── Derived values ───────────────────────────────────────────────────────
  const examTitle = EXAM_NAMES[examId] || examId;
  const score     = answers.filter(a => a.correct).length;
  const mastery   = activeQuestions.length > 0 ? Math.round((score / activeQuestions.length) * 100) : 0;
  const progress  = activeQuestions.length > 0 ? (idx / activeQuestions.length) * 100 : 0;
  const bestScore = history.length > 0 ? Math.max(...history.map(h => h.masteryPercent)) : null;

  // ─── Guards ───────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return <div className="flex justify-center items-center py-20 text-xl font-bold text-on-surface-variant">Unauthorized</div>;
  }

  if (state === STATES.LOADING) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (state === STATES.ERROR) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold text-error mb-4">Exam Pending or Not Found</h2>
        <p className="text-on-surface-variant mb-8">
          The AI extraction script might still be processing this PDF, or the data file doesn't exist yet.
        </p>
        <button onClick={() => window.location.reload()} className="btn-primary px-8">Refresh</button>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  READY — History pre-screen
  // ══════════════════════════════════════════════════════════════════════════
  if (state === STATES.READY) {
    return (
      <div className="max-w-2xl mx-auto slide-up-zoom">
        {/* Back link */}
        <Link to="/admin-exams" className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface text-sm mb-8 transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Mock Exams
        </Link>

        <div className="bg-surface-container-low rounded-2xl p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-surface-container-highest flex items-center justify-center mx-auto mb-5">
              <span className="text-4xl">📝</span>
            </div>
            <span className="mastery-badge bg-primary/10 text-primary mb-3 inline-flex">
              MULTIPLE CHOICE
            </span>
            <h1 className="text-3xl font-headline font-bold text-on-surface mt-3 mb-2">{examTitle}</h1>
            <p className="text-on-surface-variant text-sm">{originalData.length} questions available</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-surface-container rounded-xl p-5">
              <p className="text-xs text-on-surface-variant mb-1">Your Best Score</p>
              <p className="text-2xl font-headline font-bold text-on-surface">
                {bestScore !== null ? `${bestScore}%` : '—'}
              </p>
            </div>
            <div className="bg-surface-container rounded-xl p-5">
              <p className="text-xs text-on-surface-variant mb-1">Attempts</p>
              <p className="text-2xl font-headline font-bold text-on-surface">{history.length}</p>
            </div>
          </div>

          {/* Recent Attempts list */}
          {history.length > 0 && (
            <div className="mb-8">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
                Recent Attempts
              </p>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
                {history.map((attempt, i) => (
                  <button
                    key={attempt.id}
                    onClick={() => setSelectedAttempt(attempt)}
                    className="flex justify-between items-center bg-surface-container rounded-xl px-4 py-3
                               hover:bg-surface-container-high transition-colors text-left w-full group"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-on-surface truncate block">
                        {attempt.playerName || 'Anonymous'}
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        Attempt #{history.length - i} · {formatDate(attempt.attemptDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={`text-sm font-bold ${getMasteryColor(attempt.masteryPercent)}`}>
                        {attempt.score}/{attempt.total} · {attempt.masteryPercent}%
                      </span>
                      <span className="material-symbols-outlined text-on-surface-variant/50 text-base
                                       group-hover:text-on-surface-variant transition-colors">
                        chevron_right
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => setState(STATES.PRE_EXAM)}
            className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">play_arrow</span>
            Start Exam Session
          </button>
        </div>

        {/* ── Attempt Detail Modal ── */}
        {selectedAttempt && (
          <div
            className="modal-backdrop animate-fade-in"
            onClick={() => setSelectedAttempt(null)}
          >
            <div
              className="bg-surface-container-low rounded-2xl p-8 w-full max-w-md mx-4 animate-fade-in"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">
                    Attempt #{history.length - history.findIndex(h => h.id === selectedAttempt.id)}
                  </p>
                  <h3 className="text-xl font-headline font-bold text-on-surface">
                    {selectedAttempt.playerName || 'Anonymous'}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {formatDate(selectedAttempt.attemptDate)}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAttempt(null)}
                  className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  close
                </button>
              </div>

              {/* Score ring */}
              <div className="relative w-28 h-28 mx-auto mb-6">
                <div className="absolute inset-0 primary-gradient rounded-full blur-2xl opacity-20 animate-pulse-glow" />
                <div className="relative w-full h-full rounded-full bg-surface-container-highest
                                flex flex-col items-center justify-center border-4 border-primary/30">
                  <span className={`text-2xl font-headline font-bold ${getMasteryColor(selectedAttempt.masteryPercent)}`}>
                    {selectedAttempt.masteryPercent}%
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {selectedAttempt.score}/{selectedAttempt.total}
                  </span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-surface-container rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-tertiary-fixed-dim">{selectedAttempt.score}</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">Correct</p>
                </div>
                <div className="bg-surface-container rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-error">{selectedAttempt.total - selectedAttempt.score}</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">Wrong</p>
                </div>
                <div className="bg-surface-container rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-on-surface">{formatDuration(selectedAttempt.durationMs)}</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mt-0.5">Time</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedAttempt(null)}
                  className="btn-secondary flex-1"
                >
                  Close
                </button>
                {selectedAttempt.answers?.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedAttempt(null);
                      openReview(selectedAttempt.answers, `Attempt #${history.length - history.findIndex(h => h.id === selectedAttempt.id)}`, 'history');
                    }}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">visibility</span>
                    View Answers
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PRE_EXAM — Start session modal
  // ══════════════════════════════════════════════════════════════════════════
  if (state === STATES.PRE_EXAM) {
    const presets     = [10, 25, 50];
    const resolvedCount =
      questionCount === 'all'    ? originalData.length :
      questionCount === 'custom' ? (parseInt(customCount) || 0) :
      parseInt(questionCount);

    const canStart =
      playerName.trim().length > 0 &&
      (questionCount !== 'custom' || (parseInt(customCount) >= 1));

    return (
      <div className="modal-backdrop animate-fade-in" onClick={() => setState(STATES.READY)}>
        <div
          className="bg-surface-container-low rounded-2xl p-8 w-full max-w-md mx-4 slide-up-zoom"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-headline font-bold text-on-surface">Start Exam Session</h2>
            <button
              onClick={() => setState(STATES.READY)}
              className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors"
            >
              close
            </button>
          </div>
          <p className="text-on-surface-variant text-sm mb-8">
            {examTitle} · {originalData.length} questions total
          </p>

          {/* Name */}
          <div className="mb-6">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder="Enter your name..."
              autoFocus
              className="w-full p-4 rounded-xl border-2 border-outline-variant/20 bg-surface-container-high
                         text-on-surface outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/40"
            />
          </div>

          {/* Question count */}
          <div className="mb-6">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
              Number of Questions
            </label>
            <div className="flex gap-2 flex-wrap mb-3">
              {presets.map(p => (
                <button
                  key={p}
                  onClick={() => { setQuestionCount(String(p)); setCustomCount(''); }}
                  disabled={p > originalData.length}
                  className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all disabled:opacity-30
                    ${questionCount === String(p)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant/20 bg-surface-container text-on-surface-variant hover:border-primary/40'
                    }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => { setQuestionCount('all'); setCustomCount(''); }}
                className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all
                  ${questionCount === 'all'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant/20 bg-surface-container text-on-surface-variant hover:border-primary/40'
                  }`}
              >
                All ({originalData.length})
              </button>
              <button
                onClick={() => setQuestionCount('custom')}
                className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all
                  ${questionCount === 'custom'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-outline-variant/20 bg-surface-container text-on-surface-variant hover:border-primary/40'
                  }`}
              >
                Custom
              </button>
            </div>

            {questionCount === 'custom' && (
              <input
                type="number"
                value={customCount}
                onChange={e => setCustomCount(e.target.value)}
                onFocus={e => e.target.select()}
                placeholder={`1 – ${originalData.length}`}
                min={1}
                max={originalData.length}
                className="w-full p-3 rounded-xl border-2 border-primary/40 bg-surface-container-high
                           text-on-surface outline-none focus:border-primary transition-colors text-sm"
                autoFocus
              />
            )}

            {resolvedCount > 0 && (
              <p className="text-xs text-on-surface-variant mt-2">
                You'll answer{' '}
                <span className="text-primary font-bold">
                  {Math.min(resolvedCount, originalData.length)}
                </span>{' '}
                question{Math.min(resolvedCount, originalData.length) !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Shuffle */}
          <div className="flex items-center justify-between p-4 bg-surface-container rounded-xl mb-8">
            <div>
              <span className="font-semibold text-on-surface text-sm">Shuffle Questions</span>
              <p className="text-xs text-on-surface-variant mt-0.5">Randomize order each session</p>
            </div>
            <button
              onClick={() => setIsShuffleEnabled(v => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
                ${isShuffleEnabled ? 'bg-primary' : 'bg-surface-container-highest'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                  ${isShuffleEnabled ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => setState(STATES.READY)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={startExam}
              disabled={!canStart}
              className="btn-primary flex-1 flex items-center justify-center gap-2
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <span className="material-symbols-outlined">play_arrow</span>
              Begin Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  EXAM — Active question screen
  // ══════════════════════════════════════════════════════════════════════════
  if (state === STATES.EXAM) {
    const q          = activeQuestions[idx];
    const expected   = getExpectedOptions(q);
    const isConfirmedCorrect = confirmed ? checkCorrect(q, selected) : null;

    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        {/* Screen flash overlay */}
        {flashState && (
          <div
            className={`fixed inset-0 pointer-events-none z-50
              ${flashState === 'correct'
                ? 'bg-tertiary-fixed/30 flash-correct'
                : 'bg-error/25 flash-wrong'
              }`}
          />
        )}

        {/* ── Top nav bar ── */}
        <div className="flex items-center gap-4 mb-5">
          <button
            onClick={() => setState(STATES.READY)}
            className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
          >
            close
          </button>
          <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full primary-gradient rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-bold text-on-surface-variant shrink-0">
            {idx + 1}/{activeQuestions.length}
          </span>
        </div>

        {/* ── Live score counters ── */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <div className="flex items-center gap-1.5 bg-tertiary-fixed/10 text-tertiary-fixed-dim
                          px-3 py-1.5 rounded-full text-sm font-bold">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            {liveCorrect} Correct
          </div>
          <div className="flex items-center gap-1.5 bg-error/10 text-error
                          px-3 py-1.5 rounded-full text-sm font-bold">
            <span className="material-symbols-outlined text-[16px]">cancel</span>
            {liveWrong} Wrong
          </div>
          <div className="flex items-center gap-1.5 bg-surface-container text-on-surface-variant
                          px-3 py-1.5 rounded-full text-sm font-bold">
            <span className="material-symbols-outlined text-[16px]">help</span>
            {activeQuestions.length - idx - 1} Left
          </div>
        </div>

        {/* ── Question card ── */}
        <div className="bg-surface-container-low rounded-2xl p-7 mb-5">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-4">
            Question {idx + 1}
          </p>
          <p className="text-xl font-headline font-bold text-on-surface leading-snug">
            {q.question}
          </p>
        </div>

        {/* ── Options ── */}
        <div className="flex flex-col gap-3 mb-6">
          {q.type === 'identification' || !q.options || q.options.length === 0 ? (
            <input
              type="text"
              value={selected[0] || ''}
              onChange={e => handleSelect(e.target.value)}
              disabled={confirmed}
              placeholder="Type your answer here..."
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && selected.length > 0 && !confirmed) handleConfirm();
              }}
              className={`w-full p-4 rounded-xl border-2 bg-surface-container-high text-on-surface
                          text-lg outline-none transition-colors placeholder:text-on-surface-variant/40
                          ${confirmed
                            ? (checkCorrect(q, selected)
                                ? 'border-tertiary-fixed-dim/50 bg-tertiary-fixed/10'
                                : 'border-error/50 bg-error-container/10')
                            : 'border-outline-variant/20 focus:border-primary'
                          }`}
            />
          ) : (
            q.options.map((opt, i) => {
              const isSelected = selected.includes(opt);
              const isExpected = expected.includes(opt);

              let cls = 'answer-option flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ';
              if (confirmed) {
                if (isExpected)              cls += 'correct';
                else if (isSelected)         cls += 'incorrect';
                else                         cls += 'border-outline-variant/10 bg-surface-container opacity-40';
              } else if (isSelected) {
                cls += 'selected';
              } else {
                cls += 'border-outline-variant/20 bg-surface-container-high hover:border-primary/30 hover:bg-surface-container-highest';
              }

              return (
                <button key={i} onClick={() => handleSelect(opt)} className={cls}>
                  <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center
                                    text-xs font-bold shrink-0 transition-colors
                    ${confirmed && isExpected   ? 'border-tertiary-fixed-dim text-tertiary-fixed-dim' :
                      confirmed && isSelected   ? 'border-error text-error' :
                      isSelected                ? 'border-primary text-primary' :
                                                  'border-outline-variant text-on-surface-variant'}`}
                  >
                    {confirmed && isExpected
                      ? <span className="material-symbols-outlined text-[14px]">check</span>
                      : confirmed && isSelected && !isExpected
                        ? <span className="material-symbols-outlined text-[14px]">close</span>
                        : String.fromCharCode(65 + i)}
                  </span>
                  <span className="font-medium text-left">{opt}</span>
                </button>
              );
            })
          )}
        </div>

        {/* ── Confirm / Feedback / Next ── */}
        {!confirmed ? (
          <button
            onClick={handleConfirm}
            disabled={!selected || selected.length === 0}
            className="btn-primary w-full py-4 text-lg disabled:opacity-40
                       disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Confirm Answer
          </button>
        ) : (
          <div className="animate-fade-in">
            <div className={`mb-4 px-5 py-4 rounded-xl flex items-start gap-3
              ${isConfirmedCorrect ? 'bg-tertiary-fixed/10' : 'bg-error-container/20'}`}
            >
              <span className={`material-symbols-outlined mt-0.5
                ${isConfirmedCorrect ? 'text-tertiary-fixed-dim' : 'text-error'}`}
              >
                {isConfirmedCorrect ? 'check_circle' : 'cancel'}
              </span>
              <div>
                <p className={`font-bold font-headline ${isConfirmedCorrect ? 'text-tertiary-fixed-dim' : 'text-error'}`}>
                  {isConfirmedCorrect ? 'Correct!' : 'Incorrect'}
                </p>
                {!isConfirmedCorrect && (
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    Correct answer:{' '}
                    <span className="text-on-surface font-medium">{expected.join(', ')}</span>
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleNext}
              className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
            >
              {idx + 1 >= activeQuestions.length ? 'See Results' : 'Next Question'}
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SUMMARY — Results screen
  // ══════════════════════════════════════════════════════════════════════════
  if (state === STATES.SUMMARY) {
    const wrongCount = activeQuestions.length - score;

    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <div className="bg-surface-container-low rounded-2xl p-10 text-center mb-4">
          {/* Score ring */}
          <div className="relative w-32 h-32 mx-auto mb-5">
            <div className="absolute inset-0 primary-gradient rounded-full blur-2xl opacity-20 animate-pulse-glow" />
            <div className="relative w-full h-full rounded-full bg-surface-container-highest
                            flex flex-col items-center justify-center border-4 border-primary/30">
              <span className={`text-3xl font-headline font-bold ${getMasteryColor(mastery)}`}>
                {mastery}%
              </span>
              <span className="text-xs text-on-surface-variant">{score}/{activeQuestions.length}</span>
            </div>
          </div>

          <h2 className="text-2xl font-headline font-bold text-on-surface mb-1">
            {mastery >= 80 ? '🎉 Excellent Work!' : mastery >= 60 ? '👍 Good Effort!' : '📚 Keep Practicing!'}
          </h2>
          <p className="text-on-surface-variant mb-5">
            <span className="text-on-surface font-bold">{playerName.trim() || 'Anonymous'}</span>
            {' '}scored <span className="text-on-surface font-bold">{score}</span> out of {activeQuestions.length}
          </p>

          {/* Breakdown pills */}
          <div className="flex justify-center gap-3 mb-6">
            <span className="flex items-center gap-1.5 bg-tertiary-fixed/10 text-tertiary-fixed-dim
                             px-3 py-1 rounded-full text-sm font-bold">
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              {score} Correct
            </span>
            <span className="flex items-center gap-1.5 bg-error/10 text-error
                             px-3 py-1 rounded-full text-sm font-bold">
              <span className="material-symbols-outlined text-[15px]">cancel</span>
              {wrongCount} Wrong
            </span>
          </div>

          {saving ? (
            <div className="flex items-center justify-center gap-2 text-on-surface-variant mb-6">
              <span className="w-4 h-4 border-2 border-on-surface-variant/30 border-t-on-surface-variant rounded-full animate-spin" />
              Saving attempt…
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant mb-6">✓ Attempt saved to history</p>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <button
              onClick={() => setState(STATES.PRE_EXAM)}
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              Retake
            </button>
            <button
              onClick={() => openReview(answers, 'This Attempt', 'summary')}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">visibility</span>
              View Answers
            </button>
          </div>
          <button
            onClick={() => setState(STATES.READY)}
            className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"
          >
            <span className="material-symbols-outlined text-base">close</span>
            Exit to History
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  REVIEW — Question drill-down with navigator sidebar
  // ══════════════════════════════════════════════════════════════════════════
  if (state === STATES.REVIEW && reviewData) {
    const ras = reviewData.answers;
    const ra  = ras[reviewIdx];
    const backState = reviewData.source === 'history' ? STATES.READY : STATES.SUMMARY;

    return (
      <div className="max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setState(backState)}
            className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors"
          >
            arrow_back
          </button>
          <div>
            <h2 className="text-lg font-headline font-bold text-on-surface">
              Review: {reviewData.label}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {ras.filter(a => a.correct).length}/{ras.length} correct ·{' '}
              Question {reviewIdx + 1} of {ras.length}
            </p>
          </div>
        </div>

        <div className="flex gap-5 items-start">
          {/* ── Question pane ── */}
          <div className="flex-1 min-w-0">
            {/* Question card */}
            <div className={`rounded-2xl p-6 mb-4 border-l-4
              ${ra.correct
                ? 'border-tertiary-fixed-dim bg-surface-container-low'
                : 'border-error bg-surface-container-low'
              }`}
            >
              <div className="flex items-center justify-between mb-3 gap-3">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  Question {reviewIdx + 1}
                </p>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0
                  ${ra.correct
                    ? 'bg-tertiary-fixed/20 text-tertiary-fixed-dim'
                    : 'bg-error-container/20 text-error'
                  }`}
                >
                  {ra.correct ? '✓ Correct' : '✗ Incorrect'}
                </span>
              </div>
              <p className="text-lg font-medium text-on-surface leading-snug">{ra.questionText}</p>
            </div>

            {/* Answer options */}
            <div className="flex flex-col gap-2 mb-6">
              {ra.type === 'identification' || !ra.options || ra.options.length === 0 ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl flex items-center gap-3 border bg-tertiary-fixed/10 border-tertiary-fixed-dim/30">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center
                                     bg-tertiary-fixed-dim text-on-tertiary shrink-0">
                      <span className="material-symbols-outlined text-[13px]">check</span>
                    </span>
                    <span className="font-medium text-tertiary-fixed-dim flex-1">
                      {ra.correctAnswer?.join(', ')}
                    </span>
                    <span className="text-xs font-bold text-tertiary-fixed-dim">Correct Answer</span>
                  </div>
                  {!ra.correct && (
                    <div className="p-3 rounded-xl flex items-center gap-3 border bg-error-container/10 border-error/30">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center
                                       bg-error text-on-error shrink-0">
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </span>
                      <span className="font-medium text-error flex-1">{ra.chosen?.join(', ')}</span>
                      <span className="text-xs font-bold text-error">Your Answer</span>
                    </div>
                  )}
                </div>
              ) : (
                ra.options.map((opt, j) => {
                  const isCorrect = ra.correctAnswer?.includes(opt);
                  const isChosen  = ra.chosen?.includes(opt);

                  let wrapCls = 'p-3 rounded-xl flex items-center gap-3 border transition-colors ';
                  if (isCorrect)              wrapCls += 'bg-tertiary-fixed/10 border-tertiary-fixed-dim/30';
                  else if (isChosen)          wrapCls += 'bg-error-container/10 border-error/30';
                  else                        wrapCls += 'bg-surface-container border-transparent opacity-50';

                  return (
                    <div key={j} className={wrapCls}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center
                                        text-xs font-bold shrink-0
                        ${isCorrect ? 'bg-tertiary-fixed-dim text-on-tertiary' :
                          isChosen  ? 'bg-error text-on-error' :
                                      'bg-surface-container-highest text-on-surface-variant'}`}
                      >
                        {isCorrect
                          ? <span className="material-symbols-outlined text-[13px]">check</span>
                          : isChosen
                            ? <span className="material-symbols-outlined text-[13px]">close</span>
                            : String.fromCharCode(65 + j)}
                      </span>
                      <span className={`font-medium flex-1
                        ${isCorrect ? 'text-tertiary-fixed-dim' :
                          isChosen  ? 'text-error' :
                                      'text-on-surface-variant'}`}
                      >
                        {opt}
                      </span>
                      {isCorrect && !isChosen && (
                        <span className="text-xs font-bold text-tertiary-fixed-dim shrink-0">Correct</span>
                      )}
                      {isChosen && isCorrect && (
                        <span className="text-xs font-bold text-tertiary-fixed-dim shrink-0">Your Correct Answer</span>
                      )}
                      {isChosen && !isCorrect && (
                        <span className="text-xs font-bold text-error shrink-0">Your Answer</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Prev / Next */}
            <div className="flex gap-3">
              <button
                onClick={() => setReviewIdx(i => Math.max(0, i - 1))}
                disabled={reviewIdx === 0}
                className="btn-secondary flex-1 flex items-center justify-center gap-2
                           disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Previous
              </button>
              <button
                onClick={() => setReviewIdx(i => Math.min(ras.length - 1, i + 1))}
                disabled={reviewIdx === ras.length - 1}
                className="btn-primary flex-1 flex items-center justify-center gap-2
                           disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* ── Question navigator sidebar ── */}
          <div className="w-44 shrink-0 hidden md:block">
            <div className="bg-surface-container-low rounded-2xl p-4 sticky top-6">
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
                Navigator
              </p>
              <div className="grid grid-cols-4 gap-1.5 max-h-[55vh] overflow-y-auto">
                {ras.map((a, i) => (
                  <button
                    key={i}
                    onClick={() => setReviewIdx(i)}
                    title={`Question ${i + 1}: ${a.correct ? 'Correct' : 'Wrong'}`}
                    className={`w-9 h-9 rounded-lg text-xs font-bold transition-all
                      ${i === reviewIdx
                        ? 'ring-2 ring-white scale-110 ' +
                          (a.correct ? 'bg-tertiary-fixed-dim text-on-tertiary' : 'bg-error text-on-error')
                        : a.correct
                          ? 'bg-tertiary-fixed/20 text-tertiary-fixed-dim hover:bg-tertiary-fixed/40'
                          : 'bg-error/20 text-error hover:bg-error/40'
                      }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              {/* Legend */}
              <div className="mt-4 space-y-1.5 border-t border-outline-variant/20 pt-3">
                <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                  <div className="w-3 h-3 rounded bg-tertiary-fixed/30 shrink-0" />
                  Correct
                </div>
                <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                  <div className="w-3 h-3 rounded bg-error/30 shrink-0" />
                  Wrong
                </div>
                <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                  <div className="w-3 h-3 rounded ring-2 ring-white bg-tertiary-fixed-dim shrink-0" />
                  Current
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile question strip (replaces sidebar on small screens) */}
        <div className="md:hidden mt-6">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">
            Jump to Question
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {ras.map((a, i) => (
              <button
                key={i}
                onClick={() => setReviewIdx(i)}
                className={`w-9 h-9 rounded-lg text-xs font-bold transition-all
                  ${i === reviewIdx
                    ? 'ring-2 ring-white scale-110 ' +
                      (a.correct ? 'bg-tertiary-fixed-dim text-on-tertiary' : 'bg-error text-on-error')
                    : a.correct
                      ? 'bg-tertiary-fixed/20 text-tertiary-fixed-dim hover:bg-tertiary-fixed/40'
                      : 'bg-error/20 text-error hover:bg-error/40'
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

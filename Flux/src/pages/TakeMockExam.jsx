import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STATES = { LOADING: 0, READY: 1, EXAM: 2, REVIEW: 3, SUMMARY: 4, ERROR: 5 };

export default function TakeMockExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [isAdmin] = useState(
    currentUser?.email === import.meta.env.VITE_ADMIN_EMAIL || 
    import.meta.env.VITE_ADMIN_EMAIL === undefined
  );

  const [questions, setQuestions] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(true);
  const [state, setState] = useState(STATES.LOADING);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState([]);
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    if (!isAdmin) return;
    
    async function loadData() {
      try {
        // Dynamically import the json file
        const module = await import(`../data/${examId}.json`);
        const data = module.default || module;
        
        if (Array.isArray(data) && data.length > 0) {
          setOriginalData(data);
          setQuestions(data);
          setState(STATES.READY);
        } else {
          setState(STATES.ERROR);
        }
      } catch (err) {
        console.error("Failed to load exam data:", err);
        setState(STATES.ERROR);
      }
    }
    loadData();
  }, [examId, isAdmin]);

  if (!isAdmin) {
    return <div className="flex justify-center items-center py-20 text-xl font-bold">Unauthorized</div>;
  }

  function startExam() {
    let finalQuestions = [...originalData];
    if (isShuffleEnabled) {
      for (let i = finalQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [finalQuestions[i], finalQuestions[j]] = [finalQuestions[j], finalQuestions[i]];
      }
    }
    setQuestions(finalQuestions);
    setIdx(0);
    setSelected([]);
    setConfirmed(false);
    setAnswers([]);
    setState(STATES.EXAM);
  }

  function handleSelect(opt) {
    if (confirmed) return;
    const q = questions[idx];
    if (q.type === 'identification' || !q.options || q.options.length === 0) {
      setSelected([opt]);
    } else {
      if (selected.includes(opt)) {
        setSelected(selected.filter(o => o !== opt));
      } else {
        setSelected([...selected, opt]);
      }
    }
  }

  function handleConfirm() {
    if (!selected || selected.length === 0) return;
    setConfirmed(true);
  }

  function getExpectedOptions(q) {
    if (q.type === 'identification' || !q.options || q.options.length === 0) {
      return Array.isArray(q.answer) ? q.answer : [q.answer];
    }
    
    if (Array.isArray(q.answer)) {
      return q.answer;
    }

    // Find all options that uniquely appear in the correct answer string from the AI
    const rawAnswer = (q.answer || '').toLowerCase();
    const match = q.options.filter(opt => rawAnswer.includes(opt.toLowerCase()));
    return match.length > 0 ? match : [q.answer];
  }

  function handleNext() {
    const q = questions[idx];
    let correct = false;
    
    if (q.type === 'identification' || !q.options || q.options.length === 0) {
      const normalize = (s) => (s||'').toLowerCase().replace(/[^a-z0-9]/g, '');
      const actualAnswer = Array.isArray(q.answer) ? q.answer[0] : q.answer;
      correct = normalize(selected[0]) === normalize(actualAnswer);
    } else {
      const expected = getExpectedOptions(q);
      correct = selected.length === expected.length && expected.every(e => selected.includes(e));
    }

    const newAnswers = [...answers, { questionIndex: idx, chosen: selected, correct }];
    setAnswers(newAnswers);

    if (idx + 1 >= questions.length) {
      finishExam(newAnswers);
    } else {
      setIdx(i => i + 1);
      setSelected([]);
      setConfirmed(false);
    }
  }

  function finishExam(finalAnswers) {
    setAnswers(finalAnswers);
    setState(STATES.SUMMARY);
  }

  if (state === STATES.LOADING) {
    return <div className="flex justify-center items-center min-h-[50vh]"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div></div>;
  }

  if (state === STATES.ERROR) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h2 className="text-2xl font-bold text-error mb-4">Exam Pending or Not Found</h2>
        <p className="text-surface-400 mb-8">The AI extraction script might still be processing this PDF, or the data file doesn't exist yet.</p>
        <button onClick={() => window.location.reload()} className="btn-primary px-8">Refresh</button>
      </div>
    );
  }

  const q = questions[idx];
  const score = answers.filter(a => a.correct).length;
  const mastery = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const progress = questions.length > 0 ? (idx / questions.length) * 100 : 0;

  if (state === STATES.READY) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in slide-up-zoom">
        <Link to="/admin-exams" className="flex items-center gap-1 text-surface-400 hover:text-white text-sm mb-8 transition-colors">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Mock Exams
        </Link>
        <div className="panel text-center p-10">
          <div className="text-6xl mb-6">📝</div>
          <h1 className="text-3xl font-bold text-white mb-2">{examId === 'csa_exam' ? 'CSA Exam' : 'CAD Exam'}</h1>
          <p className="text-surface-400 mb-8">{originalData.length} accurately extracted questions ready for practice.</p>

          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="font-medium text-surface-200">Shuffle Questions</span>
            <button 
              onClick={() => setIsShuffleEnabled(!isShuffleEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isShuffleEnabled ? 'bg-primary' : 'bg-surface-600'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isShuffleEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <button onClick={startExam} className="btn-primary w-full py-4 text-lg">Start Exam Session</button>
        </div>
      </div>
    );
  }

  if (state === STATES.EXAM) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setState(STATES.READY)} className="material-symbols-outlined text-surface-400 hover:text-white">close</button>
          <div className="flex-1 h-2 bg-surface-700/50 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm font-bold text-surface-400">{idx + 1}/{questions.length}</span>
        </div>

        <div className="panel p-8 mb-6">
          <p className="text-xs font-bold text-primary mb-4 tracking-wider uppercase">Question {idx + 1}</p>
          <p className="text-2xl font-bold leading-relaxed">{q.question}</p>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          {q.type === 'identification' || !q.options || q.options.length === 0 ? (
            <input
              type="text"
              value={selected[0] || ''}
              onChange={e => handleSelect(e.target.value)}
              disabled={confirmed}
              className={`input w-full ${confirmed ? ((selected[0]||'').toLowerCase().trim() === q.answer.toLowerCase().trim() ? 'border-primary' : 'border-error') : ''}`}
              placeholder="Type answer here..."
              onKeyDown={e => e.key === 'Enter' && selected.length > 0 && !confirmed && handleConfirm()}
            />
          ) : (
            q.options.map((opt, i) => {
              const expected = getExpectedOptions(q);
              const isSelected = selected.includes(opt);
              const isExpected = expected.includes(opt);
              
              let cls = "panel cursor-pointer p-5 flex items-center gap-4 border-2 transition-all ";
              if (confirmed) {
                if (isExpected) cls += "border-primary bg-primary/10";
                else if (isSelected) cls += "border-error bg-error/10 text-error";
                else cls += "border-transparent opacity-50";
              } else {
                cls += isSelected ? "border-primary bg-primary/5" : "border-transparent hover:border-white/10";
              }

              return (
                <button key={i} onClick={() => handleSelect(opt)} className={cls}>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm shrink-0 ${confirmed && isExpected ? 'border-primary text-primary' : confirmed && isSelected ? 'border-error text-error' : isSelected ? 'border-primary text-primary' : 'border-surface-400'}`}>
                    {confirmed && isExpected ? '✓' : confirmed && isSelected ? '✕' : String.fromCharCode(65 + i)}
                  </div>
                  <span className="font-medium text-left">{opt}</span>
                </button>
              );
            })
          )}
        </div>

        {!confirmed ? (
          <button onClick={handleConfirm} disabled={!selected || selected.length === 0} className="btn-primary w-full py-4 text-lg disabled:opacity-50">
            Confirm Answer
          </button>
        ) : (() => {
            const expected = getExpectedOptions(q);
            let isCorrect = false;
            if (q.type === 'identification' || !q.options || q.options.length === 0) {
              const normalize = (s) => (s||'').toLowerCase().replace(/[^a-z0-9]/g, '');
              const actualAnswer = Array.isArray(q.answer) ? q.answer[0] : q.answer;
              isCorrect = normalize(selected[0]) === normalize(actualAnswer);
            } else {
              isCorrect = selected.length === expected.length && expected.every(e => selected.includes(e));
            }

            return (
              <div className="animate-fade-in slide-up">
                <div className={`panel p-6 mb-4 flex items-start gap-4 ${isCorrect ? 'border-l-4 border-primary' : 'border-l-4 border-error'}`}>
                  <div className="text-2xl">{isCorrect ? '✅' : '❌'}</div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{isCorrect ? 'Correct!' : 'Incorrect'}</h3>
                    {!isCorrect && q.type !== 'identification' && (
                      <p className="text-surface-300">The correct answer is: <span className="text-white font-bold">{expected.join(', ')}</span></p>
                    )}
                    {!isCorrect && q.type === 'identification' && (
                      <p className="text-surface-300">The correct answer is: <span className="text-white font-bold">{Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}</span></p>
                    )}
                  </div>
                </div>
                <button onClick={handleNext} className="btn-primary w-full py-4 text-lg">
                  {idx + 1 >= questions.length ? 'See Final Score' : 'Next Question'}
                </button>
              </div>
            );
        })()}
      </div>
    );
  }

  if (state === STATES.SUMMARY) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in text-center py-10">
        <div className="text-8xl mb-6">🏆</div>
        <h2 className="text-4xl font-bold text-white mb-2">Exam Complete!</h2>
        <p className="text-surface-400 text-xl mb-10">You scored {score} out of {questions.length} ({mastery}%)</p>
        
        <div className="flex gap-4 max-w-md mx-auto">
          <button onClick={startExam} className="btn-secondary flex-1 py-4">Retake</button>
          <button onClick={() => navigate('/admin-exams')} className="btn-primary flex-1 py-4">Exit</button>
        </div>
      </div>
    );
  }
}

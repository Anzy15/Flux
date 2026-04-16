import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  csa_exam: 'flux_custom_exam_csa',
  cad_exam: 'flux_custom_exam_cad',
};

const EXAM_LABELS = {
  csa_exam: 'CSA Exam',
  cad_exam: 'CAD Exam',
};

const QUESTION_TYPES = ['multiple-choice', 'identification'];

const EMPTY_FORM = {
  question: '',
  type: 'multiple-choice',
  options: ['', '', '', ''],
  correctOptions: [],
  identificationAnswer: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
}

function loadQuestions(examKey) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[examKey]);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQuestions(examKey, questions) {
  localStorage.setItem(STORAGE_KEYS[examKey], JSON.stringify(questions));
}

function toExportFormat(questions) {
  // Strip internal id — output matches csa_exam.json exactly
  return questions.map(({ id, ...rest }) => rest);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CustomExamItems() {
  const { currentUser } = useAuth();
  const isAdmin =
    currentUser?.email === import.meta.env.VITE_ADMIN_EMAIL ||
    import.meta.env.VITE_ADMIN_EMAIL === undefined;

  const [activeExam,    setActiveExam]    = useState('csa_exam');
  const [questions,     setQuestions]     = useState(() => loadQuestions('csa_exam'));
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editingId,     setEditingId]     = useState(null);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // holds id to delete
  const [copied,        setCopied]        = useState(false);
  const [copiedSingleId, setCopiedSingleId] = useState(null);

  // Reload list when tab switches
  useEffect(() => {
    setQuestions(loadQuestions(activeExam));
  }, [activeExam]);

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center py-20 text-xl font-bold text-on-surface-variant">
        Unauthorized
      </div>
    );
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  function persist(updated) {
    setQuestions(updated);
    saveQuestions(activeExam, updated);
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(q) {
    setEditingId(q.id);
    if (q.type === 'identification') {
      setForm({
        question: q.question,
        type: 'identification',
        options: ['', '', '', ''],
        correctOptions: [],
        identificationAnswer: Array.isArray(q.answer) ? q.answer[0] : (q.answer || ''),
      });
    } else {
      const opts = [...q.options];
      // Pad to at least 4 rows for UX
      while (opts.length < 4) opts.push('');
      setForm({
        question: q.question,
        type: q.type || 'multiple-choice',
        options: opts,
        correctOptions: Array.isArray(q.answer) ? q.answer : [q.answer],
        identificationAnswer: '',
      });
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function normalizeQuestion(text) {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function findDuplicateExams() {
    const normalized = normalizeQuestion(form.question);
    if (!normalized) return [];

    const examKeys = Object.keys(STORAGE_KEYS);
    return examKeys.filter(examKey => {
      const examQuestions = examKey === activeExam ? questions : loadQuestions(examKey);
      return examQuestions.some(q => {
        if (!q?.question) return false;
        if (examKey === activeExam && editingId && q.id === editingId) return false;
        return normalizeQuestion(q.question) === normalized;
      });
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  function handleSave() {
    const trimQ = form.question.trim();
    if (!trimQ) return;

    let built;
    if (form.type === 'identification') {
      const ans = form.identificationAnswer.trim();
      if (!ans) return;
      built = { question: trimQ, options: [], answer: [ans], type: 'identification' };
    } else {
      const filledOpts  = form.options.map(o => o.trim()).filter(Boolean);
      if (filledOpts.length < 2) return;
      const validCorrect = form.correctOptions.filter(c => filledOpts.includes(c.trim()) || filledOpts.includes(c));
      if (validCorrect.length === 0) return;
      built = { question: trimQ, options: filledOpts, answer: validCorrect, type: form.type };
    }

    if (editingId) {
      persist(questions.map(q => (q.id === editingId ? { ...built, id: editingId } : q)));
    } else {
      persist([...questions, { ...built, id: generateId() }]);
    }
    closeModal();
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function handleDelete(id) {
    persist(questions.filter(q => q.id !== id));
    setDeleteConfirm(null);
  }

  // ── Option row helpers ────────────────────────────────────────────────────
  function updateOption(idx, value) {
    const opts = [...form.options];
    const oldVal = opts[idx];
    opts[idx] = value;
    // Keep correctOptions in sync if this option was marked correct
    const correct = form.correctOptions.map(c => (c === oldVal ? value : c));
    setForm(f => ({ ...f, options: opts, correctOptions: correct }));
  }

  function addOption() {
    if (form.options.length >= 8) return;
    setForm(f => ({ ...f, options: [...f.options, ''] }));
  }

  function removeOption(idx) {
    const removedVal = form.options[idx];
    setForm(f => ({
      ...f,
      options: f.options.filter((_, i) => i !== idx),
      correctOptions: f.correctOptions.filter(c => c !== removedVal),
    }));
  }

  function toggleCorrect(value) {
    const v = value.trim();
    if (!v) return;
    setForm(f => ({
      ...f,
      correctOptions: f.correctOptions.includes(v)
        ? f.correctOptions.filter(c => c !== v)
        : [...f.correctOptions, v],
    }));
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function getJson() {
    return JSON.stringify(toExportFormat(questions), null, 2);
  }

  function getSingleQuestionJson(question) {
    const { id, ...exportable } = question;
    return JSON.stringify(exportable, null, 2);
  }

  function handleDownload() {
    const blob = new Blob([getJson()], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${activeExam}_custom.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getJson());
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // silently fail — clipboard might be blocked
    }
  }

  async function handleCopySingle(question) {
    try {
      await navigator.clipboard.writeText(getSingleQuestionJson(question));
      setCopiedSingleId(question.id);
      setTimeout(() => setCopiedSingleId(null), 2200);
    } catch {
      // silently fail — clipboard might be blocked
    }
  }

  // ── Validation ────────────────────────────────────────────────────────────
  const canSave = (() => {
    if (!form.question.trim()) return false;
    if (form.type === 'identification') return !!form.identificationAnswer.trim();
    const filled   = form.options.filter(o => o.trim());
    if (filled.length < 2) return false;
    return form.correctOptions.some(c => filled.includes(c));
  })();

  const duplicateInExams = findDuplicateExams();
  const hasDuplicate = duplicateInExams.length > 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">

      {/* Back link */}
      <Link
        to="/admin-exams"
        className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface text-sm mb-8 transition-colors"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        Back to Mock Exams
      </Link>

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-2xl">edit_square</span>
          </div>
          <h1 className="text-3xl font-headline font-bold text-on-surface">Custom Exam Items</h1>
        </div>
        <p className="text-on-surface-variant text-sm pl-[56px]">
          Build custom questions and export them to paste into any exam JSON file.
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 p-1 bg-surface-container rounded-xl w-fit">
        {Object.entries(EXAM_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveExam(key)}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeExam === key
                ? 'bg-surface-container-high text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Stats + Export bar ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <p className="text-sm text-on-surface-variant">
          <span className="font-bold text-on-surface text-base">{questions.length}</span>
          {' '}custom question{questions.length !== 1 ? 's' : ''} in {EXAM_LABELS[activeExam]}
        </p>

        {questions.length > 0 && (
          <div className="flex gap-2">
            {/* Copy all to clipboard */}
            <button
              onClick={handleCopy}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all
                ${copied
                  ? 'border-tertiary-fixed-dim/60 bg-tertiary-fixed/10 text-tertiary-fixed-dim'
                  : 'border-outline-variant/20 bg-surface-container text-on-surface-variant hover:border-primary/40 hover:text-on-surface'
                }`}
            >
              <span className="material-symbols-outlined text-base">
                {copied ? 'check_circle' : 'content_copy'}
              </span>
              {copied ? 'Copied!' : 'Copy All JSON'}
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-outline-variant/20 bg-surface-container
                         text-on-surface-variant hover:border-primary/40 hover:text-on-surface text-sm font-semibold transition-all"
            >
              <span className="material-symbols-outlined text-base">download</span>
              Download JSON
            </button>
          </div>
        )}
      </div>

      {/* ── Question List ── */}
      {questions.length === 0 ? (

        /* Empty state */
        <div className="bg-surface-container-low rounded-2xl p-14 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-4 block">quiz</span>
          <p className="text-on-surface font-bold mb-1">No custom questions yet</p>
          <p className="text-on-surface-variant text-sm mb-6">
            Add your first question to the {EXAM_LABELS[activeExam]} custom list.
          </p>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2 mx-auto px-6">
            <span className="material-symbols-outlined text-base">add</span>
            Add First Question
          </button>
        </div>

      ) : (

        /* List */
        <div className="flex flex-col gap-3 mb-5">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-surface-container-low rounded-2xl p-5 flex items-start gap-4 group
                         hover:bg-surface-container transition-colors"
            >
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-bold text-on-surface-variant">Q{idx + 1}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide ${
                    q.type === 'identification'
                      ? 'bg-secondary/15 text-secondary'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {q.type === 'identification' ? 'IDENTIFICATION' : 'MULTIPLE CHOICE'}
                  </span>
                  {Array.isArray(q.answer) && q.answer.length > 1 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-tertiary-fixed/10 text-tertiary-fixed-dim tracking-wide">
                      {q.answer.length} ANSWERS
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-on-surface leading-snug line-clamp-2 mb-1">
                  {q.question}
                </p>

                {q.type !== 'identification' && q.options?.length > 0 && (
                  <p className="text-xs text-on-surface-variant">
                    {q.options.length} options · ✓ {(Array.isArray(q.answer) ? q.answer : [q.answer]).join(', ')}
                  </p>
                )}
                {q.type === 'identification' && (
                  <p className="text-xs text-on-surface-variant">
                    Answer: {Array.isArray(q.answer) ? q.answer[0] : q.answer}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => openEdit(q)}
                  title="Edit question"
                  className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface
                             hover:bg-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button
                  onClick={() => handleCopySingle(q)}
                  title="Copy single JSON"
                  className={`p-2 rounded-xl transition-colors ${
                    copiedSingleId === q.id
                      ? 'text-tertiary-fixed-dim bg-tertiary-fixed/10'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {copiedSingleId === q.id ? 'check_circle' : 'content_copy'}
                  </span>
                </button>
                <button
                  onClick={() => setDeleteConfirm(q.id)}
                  title="Delete question"
                  className="p-2 rounded-xl text-on-surface-variant hover:text-error
                             hover:bg-error/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add more button (non-empty state) */}
      {questions.length > 0 && (
        <button
          onClick={openAdd}
          className="btn-primary w-full py-4 flex items-center justify-center gap-2 text-base"
        >
          <span className="material-symbols-outlined">add</span>
          Add Question
        </button>
      )}


      {/* ════════════════════════════════════════════════════════
          DELETE CONFIRM MODAL
      ════════════════════════════════════════════════════════ */}
      {deleteConfirm && (
        <div
          className="modal-backdrop animate-fade-in"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-surface-container-low rounded-2xl p-8 w-full max-w-sm mx-4 animate-fade-in text-center"
            onClick={e => e.stopPropagation()}
          >
            <span className="material-symbols-outlined text-4xl text-error mb-3 block">delete_forever</span>
            <h3 className="text-lg font-bold text-on-surface mb-2">Delete this question?</h3>
            <p className="text-on-surface-variant text-sm mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 bg-error text-on-error font-bold py-2.5 px-4 rounded-xl
                           hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ════════════════════════════════════════════════════════
          ADD / EDIT MODAL
      ════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div
          className="modal-backdrop animate-fade-in"
          onClick={closeModal}
        >
          <div
            className="bg-surface-container-low rounded-2xl p-8 w-full max-w-lg mx-4 slide-up-zoom
                       max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-headline font-bold text-on-surface">
                {editingId ? 'Edit Question' : 'Add New Question'}
              </h2>
              <button
                onClick={closeModal}
                className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors"
              >
                close
              </button>
            </div>

            {/* ── Question Type ── */}
            <div className="mb-6">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                Question Type
              </label>
              <div className="flex gap-2">
                {QUESTION_TYPES.map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({
                      ...f,
                      type: t,
                      correctOptions: [],
                      identificationAnswer: '',
                    }))}
                    className={`px-5 py-2 rounded-xl border-2 font-bold text-sm transition-all capitalize ${
                      form.type === t
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-outline-variant/20 bg-surface-container text-on-surface-variant hover:border-primary/40'
                    }`}
                  >
                    {t.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Question Text ── */}
            <div className="mb-6">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                Question <span className="text-error normal-case font-normal">*</span>
              </label>
              <textarea
                value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                placeholder="Enter the question text..."
                rows={3}
                autoFocus
                className="w-full p-4 rounded-xl border-2 border-outline-variant/20 bg-surface-container-high
                           text-on-surface text-sm outline-none focus:border-primary transition-colors
                           placeholder:text-on-surface-variant/40 resize-none"
              />
            </div>

            {/* ── Multiple-choice Options ── */}
            {form.type === 'multiple-choice' && (
              <div className="mb-6">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1 block">
                  Options
                  <span className="normal-case font-normal ml-1 text-on-surface-variant/60">
                    — check the correct answer(s)
                  </span>
                </label>

                <div className="flex flex-col gap-2 mt-3">
                  {form.options.map((opt, idx) => {
                    const trimmed = opt.trim();
                    const isCorrect = trimmed && form.correctOptions.includes(trimmed);
                    return (
                      <div key={idx} className="flex items-center gap-2">

                        {/* Correct checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleCorrect(trimmed)}
                          disabled={!trimmed}
                          title="Mark as correct"
                          className={`shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-primary/50
                            ${isCorrect
                              ? 'border-primary bg-primary' // Checked state
                              : 'border-on-surface-variant/40 bg-surface-container-high hover:border-primary/80' // Unchecked state
                            } disabled:opacity-20 disabled:cursor-not-allowed`}
                        >
                          {isCorrect && (
                            <span className="material-symbols-outlined text-on-primary text-[16px] font-bold">
                              check
                            </span>
                          )}
                        </button>

                        {/* Option input */}
                        <input
                          type="text"
                          value={opt}
                          onChange={e => updateOption(idx, e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          className={`flex-1 p-3 rounded-xl border-2 bg-surface-container-high text-sm outline-none transition-all placeholder:text-on-surface-variant/30
                                     ${isCorrect ? 'border-primary/50 text-primary font-medium' : 'border-outline-variant/20 text-on-surface focus:border-primary/60'}`}
                        />

                        {/* Remove row (keep min 2) */}
                        {form.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(idx)}
                            className="shrink-0 text-on-surface-variant/50 hover:text-error transition-colors p-1 flex items-center justify-center"
                            title="Remove option"
                          >
                            <span className="material-symbols-outlined text-xl">close</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {form.options.length < 8 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="mt-3 flex items-center gap-1 text-sm text-primary hover:text-primary/80
                               transition-colors font-semibold"
                  >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    Add Option
                  </button>
                )}
              </div>
            )}

            {/* ── Identification Answer ── */}
            {form.type === 'identification' && (
              <div className="mb-6">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2 block">
                  Correct Answer <span className="text-error normal-case font-normal">*</span>
                </label>
                <input
                  type="text"
                  value={form.identificationAnswer}
                  onChange={e => setForm(f => ({ ...f, identificationAnswer: e.target.value }))}
                  placeholder="Type the exact correct answer..."
                  className="w-full p-4 rounded-xl border-2 border-outline-variant/20 bg-surface-container-high
                             text-on-surface text-sm outline-none focus:border-primary transition-colors
                             placeholder:text-on-surface-variant/40"
                />
                <p className="text-xs text-on-surface-variant mt-2">
                  Answers are compared case-insensitively and ignore special characters.
                </p>
              </div>
            )}

            {/* Error / Helper Message */}
            {hasDuplicate && (
              <p className="text-tertiary text-center text-xs font-semibold mb-4 bg-tertiary/10 py-2 rounded-lg">
                Warning: Duplicate question found in {duplicateInExams.map(key => EXAM_LABELS[key]).join(' and ')}.
              </p>
            )}

            {!canSave && (
              <p className="text-error text-center text-xs font-semibold mb-4 bg-error/10 py-2 rounded-lg">
                {(!form.question.trim()) 
                  ? 'Please enter a question to continue.'
                  : (form.type === 'identification' && !form.identificationAnswer.trim())
                    ? 'Please provide a correct answer.'
                    : (form.options.filter(o => o.trim()).length < 2)
                      ? 'Please provide at least two options.'
                      : 'Please select at least one correct option by clicking the checkbox next to it.'}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={closeModal} className="btn-secondary flex-1 py-3">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="btn-primary flex-1 flex items-center justify-center gap-2 py-3
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all"
              >
                <span className="material-symbols-outlined text-base">
                  {editingId ? 'save' : 'add'}
                </span>
                {editingId ? 'Save Changes' : 'Add Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

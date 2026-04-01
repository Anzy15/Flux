import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc,
  deleteDoc, query, where, orderBy, limit, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

// ─── Study Sets ──────────────────────────────────────────────────

export async function createStudySet(userId, { title, sourceFileName, type, quizFormat, items }) {
  const ref = await addDoc(collection(db, 'studySets'), {
    userId,
    title,
    sourceFileName,
    type,
    quizFormat:      quizFormat || null,
    items,
    createdAt:       serverTimestamp(),
    lastStudied:     null,
    masteryPercent:  0,
  })
  return ref.id
}

export async function getStudySet(setId) {
  const snap = await getDoc(doc(db, 'studySets', setId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function getUserStudySets(userId, count = 50) {
  const q = query(collection(db, 'studySets'), where('userId', '==', userId))
  const snap = await getDocs(q)
  let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  // Sort in memory (descending by createdAt)
  docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
  return docs.slice(0, count)
}

export async function getRecentStudySets(userId, count = 6) {
  const q = query(collection(db, 'studySets'), where('userId', '==', userId))
  const snap = await getDocs(q)
  let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  // Sort in memory (descending by lastStudied)
  docs.sort((a, b) => (b.lastStudied?.toMillis?.() || 0) - (a.lastStudied?.toMillis?.() || 0))
  return docs.slice(0, count)
}

export async function updateStudySetMastery(setId, masteryPercent) {
  await updateDoc(doc(db, 'studySets', setId), {
    masteryPercent,
    lastStudied: serverTimestamp(),
  })
}

export async function deleteStudySet(setId) {
  await deleteDoc(doc(db, 'studySets', setId))
}

// ─── Flashcard Sessions ───────────────────────────────────────────

export async function saveFlashcardSession(userId, setId, { known, unknown }) {
  const total   = known + unknown
  const mastery = total > 0 ? Math.round((known / total) * 100) : 0

  await addDoc(collection(db, 'flashcardSessions'), {
    userId,
    setId,
    known,
    unknown,
    totalCards:      total,
    masteryPercent:  mastery,
    sessionDate:     serverTimestamp(),
  })

  await updateStudySetMastery(setId, mastery)
  return mastery
}

export async function getFlashcardSessions(userId, setId) {
  const q = query(collection(db, 'flashcardSessions'), where('userId', '==', userId), where('setId', '==', setId))
  const snap = await getDocs(q)
  let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  // Sort in memory (descending by sessionDate)
  docs.sort((a, b) => (b.sessionDate?.toMillis?.() || 0) - (a.sessionDate?.toMillis?.() || 0))
  return docs
}

// ─── Quiz Attempts ────────────────────────────────────────────────

export async function saveQuizAttempt(userId, setId, { score, total, answers }) {
  const mastery = total > 0 ? Math.round((score / total) * 100) : 0

  await addDoc(collection(db, 'quizAttempts'), {
    userId,
    setId,
    score,
    total,
    answers,
    masteryPercent: mastery,
    attemptDate:    serverTimestamp(),
  })

  await updateStudySetMastery(setId, mastery)
  return mastery
}

export async function getQuizAttempts(userId, setId) {
  const q = query(collection(db, 'quizAttempts'), where('userId', '==', userId), where('setId', '==', setId))
  const snap = await getDocs(q)
  let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  // Sort in memory (descending by attemptDate)
  docs.sort((a, b) => (b.attemptDate?.toMillis?.() || 0) - (a.attemptDate?.toMillis?.() || 0))
  return docs
}

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from './firebase'

/** Ensure a Firestore user document exists */
async function ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, {
      displayName: user.displayName || '',
      email:       user.email || '',
      photoURL:    user.photoURL || '',
      createdAt:   serverTimestamp(),
    })
  }
}

export async function registerWithEmail(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  await ensureUserDoc({ ...cred.user, displayName })
  return cred.user
}

export async function signInWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}

export async function updateUserProfile(displayName, photoURL) {
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName, photoURL })
    const ref = doc(db, 'users', auth.currentUser.uid)
    const updates = {}
    if (displayName !== undefined) updates.displayName = displayName
    if (photoURL    !== undefined) updates.photoURL    = photoURL
    await setDoc(ref, updates, { merge: true })
  }
}

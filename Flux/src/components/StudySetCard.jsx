import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { deleteStudySet } from '../services/firestore'
import MasteryBar from './ui/MasteryBar'

const TYPE_STYLES = {
  flashcard: {
    badge: 'bg-secondary-container text-on-secondary-container',
    label: 'Flashcard Deck',
    icon:  'style',
    path:  '/flashcards',
  },
  quiz: {
    badge: 'bg-primary-container/10 text-primary',
    label: 'Quiz',
    icon:  'quiz',
    path:  '/quiz',
  },
}

function timeAgo(timestamp) {
  if (!timestamp) return 'Not studied yet'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const diff  = (Date.now() - date.getTime()) / 1000
  if (diff < 60)    return 'Just now'
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

export default function StudySetCard({ set, onDeleted, wide = false }) {
  const { currentUser } = useAuth()
  const style = TYPE_STYLES[set.type] || TYPE_STYLES.flashcard

  async function handleDelete(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete "${set.title}"?`)) return
    await deleteStudySet(set.id)
    onDeleted?.()
  }

  const cardContent = (
    <div className={`study-card group animate-fade-in ${wide ? 'md:col-span-2' : ''}`}>
      {/* Glow accent on hover */}
      <div className="absolute inset-0 primary-gradient opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 rounded-xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        <span className={`mastery-badge ${style.badge}`}>
          <span className="material-symbols-outlined text-xs">{style.icon}</span>
          {style.label}
        </span>
        <button
          onClick={handleDelete}
          className="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors text-lg opacity-0 group-hover:opacity-100"
        >
          delete
        </button>
      </div>

      {/* Title */}
      <h4 className="text-xl font-headline font-bold mb-1.5 group-hover:text-primary transition-colors leading-tight">
        {set.title}
      </h4>
      <p className="text-on-surface-variant text-sm mb-10">
        {set.lastStudied
          ? `Last studied ${timeAgo(set.lastStudied)}`
          : `From "${set.sourceFileName}"`}
      </p>

      {/* Mastery */}
      <div className="mt-auto">
        <div className="flex justify-between items-end mb-1.5">
          <MasteryBar percent={set.masteryPercent || 0} className="flex-1" />
          <span className="text-xs font-bold text-primary ml-4 shrink-0">
            {set.type === 'quiz'
              ? `${set.items?.length || 0} Questions`
              : `${set.items?.length || 0} Cards`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-2">
        <Link
          to={`${style.path}/${set.id}?mode=review`}
          className="flex flex-1 items-center justify-center gap-1.5 py-2.5 rounded-md bg-transparent border-2 border-surface-container-high text-on-surface-variant text-sm font-bold font-headline hover:border-primary hover:text-primary transition-all duration-200"
          onClick={e => e.stopPropagation()}
          title="Review Content"
        >
          <span className="material-symbols-outlined text-[18px]">visibility</span>
          Review
        </Link>
        <Link
          to={`${style.path}/${set.id}`}
          className="flex flex-[2] items-center justify-center gap-1.5 py-2.5 rounded-md bg-surface-container-high text-primary text-sm font-bold font-headline hover:bg-primary hover:text-on-primary transition-all duration-200"
          onClick={e => e.stopPropagation()}
        >
          <span className="material-symbols-outlined text-[18px]">play_arrow</span>
          Study Now
        </Link>
      </div>
    </div>
  )

  return cardContent
}

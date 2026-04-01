import { Link } from 'react-router-dom'
import { useStudySets } from '../hooks/useStudySets'

function timeAgo(timestamp) {
  if (!timestamp) return 'Never'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const diff  = (Date.now() - date.getTime()) / 1000
  if (diff < 60)    return 'Just now'
  if (diff < 3600)  return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  if (diff < 604800)return `${Math.round(diff / 86400)}d ago`
  return date.toLocaleDateString()
}

const TYPE_META = {
  flashcard: { label: 'Flashcard Deck', icon: 'style',  color: 'bg-secondary-container text-on-secondary-container', path: '/flashcards' },
  quiz:      { label: 'Quiz',           icon: 'quiz',   color: 'bg-primary-container/10 text-primary',               path: '/quiz' },
}

export default function Recent() {
  const { sets, loading, refresh } = useStudySets('all')

  // Sort by createdAt descending
  const sorted = [...sets].sort((a, b) => {
    const aT = a.createdAt?.toMillis?.() || 0
    const bT = b.createdAt?.toMillis?.() || 0
    return bT - aT
  })

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-on-surface mb-1">Recent Uploads</h1>
        <div className="h-1 w-10 primary-gradient mt-2 mb-4 rounded-full" />
        <p className="text-on-surface-variant">All your PDF-generated study sets, newest first.</p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-surface-container rounded-xl p-6 flex items-center gap-6 animate-pulse">
              <div className="w-12 h-12 rounded-lg bg-surface-container-high shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-surface-container-high rounded w-1/3 mb-2" />
                <div className="h-3 bg-surface-container-high rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4">history</span>
          <h4 className="font-headline font-bold text-on-surface mb-2">No uploads yet</h4>
          <p className="text-on-surface-variant text-sm max-w-xs mb-6">
            Upload a PDF from the Home page to start building your study library.
          </p>
          <Link to="/" className="btn-primary flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-base">upload_file</span>
            Upload PDF
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((set, i) => {
            const meta = TYPE_META[set.type] || TYPE_META.flashcard
            return (
              <div
                key={set.id}
                className="group bg-surface-container hover:bg-surface-container-high transition-all duration-200 rounded-xl p-5 md:p-6 flex items-center gap-4 md:gap-6 animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-primary text-xl">{meta.icon}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className="font-headline font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                      {set.title}
                    </h4>
                    <span className={`mastery-badge ${meta.color} shrink-0`}>{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant flex-wrap">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">picture_as_pdf</span>
                      {set.sourceFileName}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      Created {timeAgo(set.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">layers</span>
                      {set.items?.length || 0} {set.type === 'quiz' ? 'questions' : 'cards'}
                    </span>
                  </div>
                </div>

                {/* Mastery */}
                <div className="hidden md:flex flex-col items-end gap-1 shrink-0 w-28">
                  <span className={`text-sm font-bold ${
                    (set.masteryPercent || 0) >= 80 ? 'text-tertiary-fixed-dim' :
                    (set.masteryPercent || 0) >= 50 ? 'text-primary' : 'text-on-surface-variant'
                  }`}>
                    {set.masteryPercent || 0}% Mastery
                  </span>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full primary-gradient rounded-full" style={{ width: `${set.masteryPercent || 0}%` }} />
                  </div>
                </div>

                {/* Study button */}
                <Link
                  to={`${meta.path}/${set.id}`}
                  className="shrink-0 btn-secondary text-sm px-4 py-2 text-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">play_arrow</span>
                  Study
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

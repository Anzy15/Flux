import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudySets } from '../hooks/useStudySets'
import { deleteStudySet } from '../services/firestore'
import StudySetCard from '../components/StudySetCard'

const FILTERS = ['All', 'Flashcard', 'Quiz']
const SORTS   = [
  { label: 'Newest First',  key: 'createdAt',      dir: 'desc' },
  { label: 'Last Studied',  key: 'lastStudied',     dir: 'desc' },
  { label: 'Top Mastery',   key: 'masteryPercent',  dir: 'desc' },
  { label: 'Lowest Mastery',key: 'masteryPercent',  dir: 'asc'  },
]

export default function Library() {
  const { sets, loading, refresh } = useStudySets('all')

  const [filter,  setFilter]  = useState('All')
  const [sortIdx, setSortIdx] = useState(0)
  const [search,  setSearch]  = useState('')

  const sort = SORTS[sortIdx]

  const filtered = sets
    .filter(s => {
      if (filter === 'Flashcard' && s.type !== 'flashcard') return false
      if (filter === 'Quiz'      && s.type !== 'quiz')      return false
      if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      const aVal = a[sort.key]?.toMillis?.() ?? a[sort.key] ?? 0
      const bVal = b[sort.key]?.toMillis?.() ?? b[sort.key] ?? 0
      return sort.dir === 'desc' ? bVal - aVal : aVal - bVal
    })

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-on-surface mb-1">My Library</h1>
        <div className="h-1 w-10 primary-gradient mt-2 mb-4 rounded-full" />
        <p className="text-on-surface-variant">{sets.length} study set{sets.length !== 1 ? 's' : ''} in your collection</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {/* Search */}
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">search</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your sets…"
            className="flux-input pl-12"
          />
        </div>

        {/* Type filter */}
        <div className="flex bg-surface-container-high rounded-md p-1 gap-1">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded text-sm font-bold font-headline transition-all ${
                filter === f
                  ? 'bg-surface-container-highest text-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortIdx}
          onChange={e => setSortIdx(Number(e.target.value))}
          className="bg-surface-container-high text-on-surface text-sm rounded-md px-4 py-2.5 outline-none cursor-pointer border-0"
        >
          {SORTS.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-surface-container rounded-xl p-8 h-52 animate-pulse">
              <div className="h-4 bg-surface-container-high rounded w-1/3 mb-3" />
              <div className="h-6 bg-surface-container-high rounded w-2/3 mb-2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4">
            {search ? 'search_off' : 'library_books'}
          </span>
          <h4 className="font-headline font-bold text-on-surface mb-2">
            {search ? 'No sets match your search' : 'No study sets found'}
          </h4>
          <p className="text-on-surface-variant text-sm max-w-xs">
            {search ? 'Try a different search term.' : 'Upload a PDF on the Home page to create your first set.'}
          </p>
          {!search && (
            <Link to="/" className="btn-primary mt-6 flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-base">upload_file</span>
              Upload PDF
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(set => (
            <StudySetCard key={set.id} set={set} onDeleted={refresh} />
          ))}
        </div>
      )}
    </div>
  )
}

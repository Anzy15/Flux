import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useStudySets } from '../hooks/useStudySets'
import UploadZone from '../components/UploadZone'
import ConvertModal from '../components/ConvertModal'
import StudySetCard from '../components/StudySetCard'

export default function Dashboard() {
  const { currentUser } = useAuth()
  const { sets, loading, refresh } = useStudySets('all')

  const [uploadedFile, setUploadedFile] = useState(null)
  const [modalOpen,    setModalOpen]    = useState(false)

  function handleFileSelected(file) {
    setUploadedFile(file)
    setModalOpen(true)
  }

  function handleModalClose() {
    setModalOpen(false)
    setUploadedFile(null)
    refresh()
  }

  // Sort: last studied first, then by createdAt
  const recentSets = [...sets]
    .sort((a, b) => {
      const aT = a.lastStudied?.toMillis?.() || a.createdAt?.toMillis?.() || 0
      const bT = b.lastStudied?.toMillis?.() || b.createdAt?.toMillis?.() || 0
      return bT - aT
    })
    .slice(0, 6)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const overallMastery = sets.length > 0
    ? Math.round(sets.reduce((acc, s) => acc + (s.masteryPercent || 0), 0) / sets.length)
    : 0

  return (
    <div className="animate-fade-in">
      {/* ── Hero / Upload ── */}
      <section className="mb-16">
        <div className="mb-8 max-w-2xl">
          <p className="text-on-surface-variant text-sm mb-1 font-medium">
            {greeting()}, {currentUser?.displayName?.split(' ')[0] || 'Scholar'} 👋
          </p>
          <h2 className="text-4xl md:text-5xl font-headline font-bold tracking-tight text-on-surface mb-4">
            Ignite Your <span className="text-gradient">Intelligence.</span>
          </h2>
          <p className="text-on-surface-variant text-lg leading-relaxed">
            Transform static documents into dynamic study ecosystems. Upload a PDF and let the Loom weave your mastery path.
          </p>
        </div>

        <UploadZone onFileSelected={handleFileSelected} />
      </section>

      {/* ── Stats bar ── */}
      {sets.length > 0 && (
        <section className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: 'collections_bookmark', label: 'Total Sets',       value: sets.length },
            { icon: 'style',               label: 'Flashcard Decks',  value: sets.filter(s => s.type === 'flashcard').length },
            { icon: 'quiz',                label: 'Quizzes',           value: sets.filter(s => s.type === 'quiz').length },
            { icon: 'trending_up',         label: 'Avg. Mastery',      value: `${overallMastery}%` },
          ].map(stat => (
            <div key={stat.label} className="bg-surface-container-low rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-xl">{stat.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-headline font-bold text-on-surface">{stat.value}</p>
                <p className="text-xs text-on-surface-variant">{stat.label}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Recent Study Sets ── */}
      <section>
        <div className="flex justify-between items-end mb-8">
          <div>
            <h3 className="text-2xl font-headline font-bold text-on-surface">Recent Study Sets</h3>
            <div className="h-1 w-10 primary-gradient mt-2 rounded-full" />
          </div>
          {sets.length > 0 && (
            <Link to="/library" className="text-primary font-headline font-medium flex items-center gap-1.5 hover:gap-2.5 transition-all text-sm">
              View All
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-surface-container rounded-xl p-8 h-52 animate-pulse">
                <div className="h-4 bg-surface-container-high rounded w-1/3 mb-3" />
                <div className="h-6 bg-surface-container-high rounded w-2/3 mb-2" />
                <div className="h-3 bg-surface-container-high rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : recentSets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant">menu_book</span>
            </div>
            <h4 className="font-headline font-bold text-on-surface mb-2">No study sets yet</h4>
            <p className="text-on-surface-variant text-sm max-w-xs">
              Upload your first PDF above to get started with AI-powered studying.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentSets.map(set => (
              <StudySetCard key={set.id} set={set} onDeleted={refresh} />
            ))}
            {/* Create new CTA card */}
            <button
              onClick={() => document.querySelector('input[type=file]')?.click()}
              className="group flex flex-col items-center justify-center bg-surface-container-lowest border-2 border-dashed border-outline-variant/20 rounded-xl p-8 hover:border-primary/40 transition-all duration-300 min-h-[200px]"
            >
              <div className="h-14 w-14 rounded-full bg-surface-container-high flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-3xl">add</span>
              </div>
              <p className="font-headline font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">
                Create New Set
              </p>
            </button>
          </div>
        )}
      </section>

      {/* ── AI Insight section ── */}
      {sets.length > 0 && (
        <section className="mt-16">
          <div className="bg-surface-container-low rounded-xl p-8 md:p-10 flex flex-col md:flex-row gap-8 items-center">
            <div className="w-full md:w-auto shrink-0">
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 primary-gradient rounded-full blur-2xl opacity-20 animate-pulse-glow" />
                <div className="relative w-full h-full bg-surface-container-highest rounded-full flex items-center justify-center border border-outline-variant/20">
                  <span className="material-symbols-outlined text-5xl text-primary">psychology</span>
                </div>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-headline font-bold mb-3 text-on-surface">Loom Intelligence</h3>
              <p className="text-on-surface-variant leading-relaxed mb-6 italic max-w-xl">
                {overallMastery >= 80
                  ? `"Outstanding! Your average mastery is ${overallMastery}%. You're excelling across all your study sets. Keep pushing to perfect your knowledge."`
                  : overallMastery >= 50
                  ? `"You've reached ${overallMastery}% average mastery. Focus on your lower-scored sets — consistent review sessions will accelerate your progress significantly."`
                  : `"Your journey begins. With ${sets.length} study set${sets.length > 1 ? 's' : ''} in your library, start with daily short sessions to build lasting mastery."`}
              </p>
              <Link to="/library" className="btn-secondary inline-flex items-center gap-2 text-sm">
                View Full Library
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Convert modal */}
      <ConvertModal
        open={modalOpen}
        file={uploadedFile}
        onClose={handleModalClose}
      />
    </div>
  )
}

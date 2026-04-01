import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/', icon: 'home', label: 'Home' },
  { to: '/library', icon: 'library_books', label: 'My Library' },
  { to: '/recent', icon: 'history', label: 'Recent Uploads' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
]

export default function Sidebar({ onUploadClick }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 z-40 flex-col py-8 px-4 gap-y-4 bg-surface-container-low font-headline shadow-ambient">
      {/* Branding */}
      <div className="mt-4 mb-8 px-2">
        <h1 className="text-4xl font-headline font-bold text-on-surface tracking-tight">Flux</h1>
        <p className="text-[11px] text-on-surface-variant tracking-[0.25em] font-medium uppercase mt-2">Intellectual Mastery</p>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1">
        {navItems.map(item => {
          const active = location.pathname === item.to
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-item ${active ? 'active' : ''}`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Upload CTA */}
      <div className="mt-4 px-2">
        <button
          onClick={onUploadClick}
          className="w-full btn-primary flex items-center justify-center gap-2 text-sm"
        >
          <span className="material-symbols-outlined text-base">upload_file</span>
          Upload PDF
        </button>
      </div>

      {/* User card */}
      <div className="mt-auto p-4 bg-surface-container rounded-xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-outline-variant/20 shrink-0">
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-surface-container-high text-primary font-bold text-sm">
                {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-on-surface truncate">
              {currentUser?.displayName || 'User'}
            </p>
            <p className="text-xs text-on-surface-variant truncate">{currentUser?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 text-xs text-on-surface-variant hover:text-error transition-colors py-1"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  )
}

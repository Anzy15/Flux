import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Navbar({ onUploadClick }) {
  const { currentUser } = useAuth()
  const location = useLocation()

  const navLinks = [
    { to: '/',        label: 'Home' },
    { to: '/library', label: 'My Library' },
    { to: '/recent',  label: 'Recent Uploads' },
    { to: '/settings',label: 'Settings' },
  ]

  return (
    <nav className="fixed top-0 w-full md:w-[calc(100%-16rem)] md:left-64 z-40 px-4 md:px-8 h-16 glass font-headline text-on-surface border-b border-outline-variant/5">
      <div className="w-full h-full flex justify-between items-center">
        {/* Logo (mobile mostly, or distinct page marker) */}
        <Link to="/" className="flex items-center gap-2 select-none md:hidden">
          <span className="text-2xl font-bold tracking-tight text-gradient">Flux</span>
        </Link>
        <div className="hidden md:flex flex-1" />

        {/* Desktop links - these will now be perfectly centered since flex-1 is on both sides */}
        <div className="hidden md:flex items-center gap-8 justify-center">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`font-medium transition-colors duration-200 ${
                location.pathname === link.to
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-5 flex-1 justify-end">
          <button
            onClick={onUploadClick}
            className="hidden md:flex primary-gradient text-on-primary font-bold text-sm rounded-md px-4 py-2 items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            Upload PDF
          </button>

          <Link to="/settings">
            <div className="h-8 w-8 rounded-full bg-surface-container-highest overflow-hidden ring-1 ring-outline-variant/20 hover:ring-primary/40 transition-all">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface-container-high text-primary font-bold text-sm">
                  {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
                </div>
              )}
            </div>
          </Link>
        </div>
      </div>
    </nav>
  )
}

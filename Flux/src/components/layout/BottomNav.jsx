import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/',        icon: 'home',          label: 'Home' },
  { to: '/library', icon: 'library_books', label: 'Library' },
  { to: '/recent',  icon: 'history',       label: 'Recent' },
  { to: '/settings',icon: 'settings',      label: 'Settings' },
]

export default function BottomNav({ onUploadClick }) {
  const location = useLocation()
  const { currentUser } = useAuth()

  const isAdmin = currentUser?.email === import.meta.env.VITE_ADMIN_EMAIL || import.meta.env.VITE_ADMIN_EMAIL === undefined
  
  const rightItems = isAdmin 
    ? [ { to: '/admin-exams', icon: 'admin_panel_settings', label: 'Exams' }, ...navItems.slice(2)]
    : navItems.slice(2)

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface/90 backdrop-blur-xl flex items-center h-20 px-2 z-50 border-t border-outline-variant/10">
      <div className="flex-1 flex justify-evenly items-center">
      {navItems.slice(0, 2).map(item => {
        const active = location.pathname === item.to
        return (
          <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 transition-colors ${active ? 'text-primary' : 'text-on-surface-variant'}`}>
            <span className="material-symbols-outlined text-2xl">{item.icon}</span>
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        )
      })}
      </div>

      {/* Center upload FAB */}
      <div className="relative -top-5 shrink-0 px-2">
        <button
          onClick={onUploadClick}
          className="h-14 w-14 primary-gradient rounded-full flex items-center justify-center shadow-primary active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-on-primary text-3xl">add</span>
        </button>
      </div>

      <div className="flex-1 flex justify-evenly items-center">
      {rightItems.map(item => {
        const active = location.pathname === item.to || (item.to === '/admin-exams' && location.pathname.startsWith('/admin-exams'))
        return (
          <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 transition-colors ${active ? 'text-primary' : 'text-on-surface-variant'}`}>
            <span className="material-symbols-outlined text-2xl">{item.icon}</span>
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        )
      })}
      </div>
    </nav>
  )
}

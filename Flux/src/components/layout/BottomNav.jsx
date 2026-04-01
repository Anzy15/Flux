import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/',        icon: 'home',          label: 'Home' },
  { to: '/library', icon: 'library_books', label: 'Library' },
  { to: '/recent',  icon: 'history',       label: 'Recent' },
  { to: '/settings',icon: 'settings',      label: 'Settings' },
]

export default function BottomNav({ onUploadClick }) {
  const location = useLocation()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface/90 backdrop-blur-xl flex justify-around items-center h-20 px-4 z-50 border-t border-outline-variant/10">
      {navItems.slice(0, 2).map(item => {
        const active = location.pathname === item.to
        return (
          <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 transition-colors ${active ? 'text-primary' : 'text-on-surface-variant'}`}>
            <span className="material-symbols-outlined text-2xl">{item.icon}</span>
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        )
      })}

      {/* Center upload FAB */}
      <div className="relative -top-5">
        <button
          onClick={onUploadClick}
          className="h-14 w-14 primary-gradient rounded-full flex items-center justify-center shadow-primary active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-on-primary text-3xl">add</span>
        </button>
      </div>

      {navItems.slice(2).map(item => {
        const active = location.pathname === item.to
        return (
          <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 transition-colors ${active ? 'text-primary' : 'text-on-surface-variant'}`}>
            <span className="material-symbols-outlined text-2xl">{item.icon}</span>
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

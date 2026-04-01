import { useEffect } from 'react'

export default function Modal({ open, onClose, children, className = '', size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`relative w-full mx-4 bg-surface-container rounded-2xl p-8 shadow-ambient animate-slide-up ${sizes[size]} ${className}`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

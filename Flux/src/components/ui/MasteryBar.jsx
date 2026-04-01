export default function MasteryBar({ percent = 0, className = '' }) {
  const color =
    percent >= 80 ? 'from-tertiary-fixed-dim to-tertiary-dim' :
    percent >= 50 ? 'from-primary to-primary-dim' :
                   'from-primary-dim to-primary-container/70'

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-end mb-1.5">
        <span className="text-xs font-bold text-on-surface-variant">{percent}% Mastery</span>
      </div>
      <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

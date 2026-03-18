interface ProgressBarProps {
  value: number
  color?: 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'pink' | 'yellow'
  className?: string
}

export function ProgressBar({ value, color = 'blue', className = '' }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className={`progress-track ${className}`}>
      <div
        className={`progress-fill progress-${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

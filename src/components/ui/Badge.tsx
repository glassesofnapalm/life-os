import type { ReactNode } from 'react'

const colorMap: Record<string, string> = {
  blue:    'badge badge-blue',
  purple:  'badge badge-purple',
  pink:    'badge badge-pink',
  green:   'badge badge-green',
  orange:  'badge badge-orange',
  red:     'badge badge-red',
  yellow:  'badge badge-yellow',
  default: 'badge badge-default',
}

interface BadgeProps {
  children: ReactNode
  color?: string
  className?: string
}

export function Badge({ children, color = 'default', className = '' }: BadgeProps) {
  const cls = colorMap[color] || colorMap.default
  return <span className={`${cls} ${className}`}>{children}</span>
}

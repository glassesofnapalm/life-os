import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  interactive?: boolean
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
}

const paddings = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' }

export function GlassCard({ children, className = '', interactive = false, onClick, padding = 'md', style }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      whileHover={interactive ? { y: -1 } : undefined}
      onClick={onClick}
      style={style}
      className={`glass-card ${paddings[padding]} ${interactive ? 'glass-card-interactive' : ''} ${className}`}
    >
      {children}
    </motion.div>
  )
}

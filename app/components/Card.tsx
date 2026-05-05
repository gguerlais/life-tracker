'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

export default function Card({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={`bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border)] backdrop-blur-sm ${className}`}
    >
      {children}
    </motion.div>
  )
}
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import BottomNav from './components/BottomNav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Life Tracker',
  description: 'Suivi quotidien : mood, sommeil, nutrition, sport, apprentissage',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        {children}
        <BottomNav />
      </body>
    </html>
  )
}

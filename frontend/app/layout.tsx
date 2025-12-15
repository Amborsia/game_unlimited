import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '게임',
  description: '자동 전투 게임',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}


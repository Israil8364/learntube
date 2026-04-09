import type { Metadata } from 'next'
import { Geist, Geist_Mono, League_Spartan } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });
const leagueSpartan = League_Spartan({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-league-spartan" });

export const metadata: Metadata = {
  title: 'LearnTube - Learn Smarter from YouTube',
  description: 'Extract transcripts, summaries, and actionable insights from any YouTube video using AI. Learn efficiently with our intelligent video analysis tool.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/learntube_logo.svg?v=2', type: 'image/svg+xml' },
    ],
    shortcut: '/learntube_logo.svg?v=2',
    apple: '/learntube_logo.png?v=2',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${_geist.className} ${leagueSpartan.variable} antialiased min-h-screen`} suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  )
}

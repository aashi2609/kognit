import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { MouseParallaxProvider } from '@/components/mouse-parallax-provider'
import { CyberClassroomBg } from '@/components/cyber-classroom-bg'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'KOGNIT — Socratic Coaching Terminal',
  description:
    'A Socratic coding coach that rebuilds understanding, not just copied logic. Initialize your coaching run.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#020202',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="font-sans antialiased text-foreground">
        <MouseParallaxProvider>
          {/* Persistent cyber-classroom environment — stays continuous across all route transitions */}
          <CyberClassroomBg />
          {/* Page content renders above the background */}
          <div className="relative z-10">
            {children}
          </div>
        </MouseParallaxProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

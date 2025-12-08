import React from 'react'
import Link from 'next/link'
import '@/styles/globals.css'
import { Inter as FontSans } from 'next/font/google'
import { Metadata } from 'next'

import { cn } from '@/lib/utils'
import ThemeProvider from '@/components/providers/theme-provider'

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans'
})

export const metadata: Metadata = {
  title: 'Nextron Boilerplate',
  description:
    'Nextron ( Next.Js + Electron ) project boilerplate in TypeScript, with TailwindCSS + Shadcn/ui, web and desktop crossbuild'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning>
      <body
        className={cn(
          'bg-background min-h-screen font-sans antialiased',
          fontSans.variable
        )}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <div className="flex min-h-screen flex-col">
            <AppNav />
            <main className="flex-1">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

function AppNav() {
  const links = [
    { href: '/', label: '工作台' },
    { href: '/mini', label: 'Mini 模式' },
    { href: '/history', label: '历史记录' },
    { href: '/settings', label: '设置' }
  ]

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-800">Nano Translate</span>
        <nav className="flex gap-4">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1 transition-colors hover:bg-blue-50 hover:text-blue-600">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}

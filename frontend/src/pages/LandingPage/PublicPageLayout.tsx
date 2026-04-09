import type { ReactNode } from 'react'
import { Header } from '@/pages/LandingPage/Header'
import { FAQ } from '@/pages/LandingPage/FAQ'
import { Footer } from '@/pages/LandingPage/Footer'

type PublicPageLayoutProps = {
  children: ReactNode
}

export function PublicPageLayout({ children }: PublicPageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <FAQ />
      <Footer />
    </div>
  )
}

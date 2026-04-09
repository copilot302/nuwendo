import { Hero } from './Hero'
import { HomeSections } from './HomeSections'
import { PublicPageLayout } from './PublicPageLayout'

export function LandingPage() {
  return (
    <PublicPageLayout>
      <Hero />
      <HomeSections />
    </PublicPageLayout>
  )
}

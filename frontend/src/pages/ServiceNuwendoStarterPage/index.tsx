import { Link } from 'react-router-dom'
import { PublicPageLayout } from '@/pages/LandingPage/PublicPageLayout'
import { Button } from '@/components/ui/button'

export default function ServiceNuwendoStarterPage() {
  return (
    <PublicPageLayout>
      <section className="bg-gray-50 py-16">
        <div className="container max-w-3xl">
          <p className="text-brand font-medium mb-2">Services</p>
          <h1 className="text-4xl font-bold text-brand-800 mb-4">Nuwendo Starter</h1>
          <p className="text-gray-700 leading-relaxed mb-6">
            A structured doctor-led program with regular follow-ups, progress checks,
            and plan adjustments based on your response and goals.
          </p>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
            <h2 className="text-xl font-semibold text-brand-800 mb-3">What to expect</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Regular physician and care-team follow-up</li>
              <li>Habit and nutrition guidance</li>
              <li>Ongoing progress monitoring</li>
              <li>Actionable adjustments to your care plan</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Link to="/signup">
              <Button className="bg-brand hover:bg-brand-600">Book Consultation</Button>
            </Link>
            <Link to="/services">
              <Button variant="outline">Back to Services</Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  )
}

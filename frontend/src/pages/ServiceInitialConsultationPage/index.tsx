import { Link } from 'react-router-dom'
import { PublicPageLayout } from '@/pages/LandingPage/PublicPageLayout'
import { Button } from '@/components/ui/button'

export default function ServiceInitialConsultationPage() {
  return (
    <PublicPageLayout>
      <section className="bg-gray-50 py-16">
        <div className="container max-w-3xl">
          <p className="text-brand font-medium mb-2">Services</p>
          <h1 className="text-4xl font-bold text-brand-800 mb-4">Initial Consultation</h1>
          <p className="text-gray-700 leading-relaxed mb-6">
            Your first complete medical consultation with intake assessment,
            baseline goals, and a personalized starting plan.
          </p>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
            <h2 className="text-xl font-semibold text-brand-800 mb-3">What’s included</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Medical intake and history review</li>
              <li>Risk and lifestyle assessment</li>
              <li>Initial treatment and nutrition direction</li>
              <li>Clear next-step recommendations</li>
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

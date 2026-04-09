import { Link } from 'react-router-dom'
import { PublicPageLayout } from '@/pages/LandingPage/PublicPageLayout'
import { Button } from '@/components/ui/button'

export default function AddOnFollowUpPage() {
  return (
    <PublicPageLayout>
      <section className="bg-gray-50 py-16">
        <div className="container max-w-3xl">
          <p className="text-brand font-medium mb-2">Add On</p>
          <h1 className="text-4xl font-bold text-brand-800 mb-4">Follow Up</h1>
          <p className="text-gray-700 leading-relaxed mb-6">
            Ongoing follow-up sessions to review progress, reinforce habits,
            and adjust care plans based on your current response.
          </p>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
            <h2 className="text-xl font-semibold text-brand-800 mb-3">Best for</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Patients continuing their current plan</li>
              <li>Progress checks and medication monitoring</li>
              <li>Fine-tuning routines for better results</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Link to="/signup">
              <Button className="bg-brand hover:bg-brand-600">Book Consultation</Button>
            </Link>
            <Link to="/add-on">
              <Button variant="outline">Back to Add On</Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  )
}

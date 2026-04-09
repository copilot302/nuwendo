import { Link } from 'react-router-dom'
import { Services } from '@/pages/LandingPage/Services'
import { PublicPageLayout } from '@/pages/LandingPage/PublicPageLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ServicesPage() {
  return (
    <PublicPageLayout>
      <Services />

      <section className="py-16 bg-white">
        <div className="container">
          <h2 className="text-2xl font-bold text-brand-800 mb-6">Service Pages</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link to="/services/nuwendo-starter">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Nuwendo Starter</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Structured follow-ups and habit coaching program.
                </CardContent>
              </Card>
            </Link>

            <Link to="/services/initial-consultation">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Initial Consultation</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Full medical intake and personalized starter plan.
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  )
}

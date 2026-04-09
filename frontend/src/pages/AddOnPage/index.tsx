import { Link } from 'react-router-dom'
import { AddOn } from '@/pages/LandingPage/AddOn'
import { PublicPageLayout } from '@/pages/LandingPage/PublicPageLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AddOnPage() {
  return (
    <PublicPageLayout>
      <AddOn />

      <section className="py-16 bg-gray-50">
        <div className="container">
          <h2 className="text-2xl font-bold text-brand-800 mb-6">Add On Services</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link to="/add-on/follow-up">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Follow Up</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Continued monitoring and treatment adjustments.
                </CardContent>
              </Card>
            </Link>

            <Link to="/add-on/nutrition-plan">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>Nutrition Plan</CardTitle>
                </CardHeader>
                <CardContent className="text-gray-600">
                  Personalized nutrition strategy for your goals.
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  )
}

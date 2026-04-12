import { AdminLayout } from '@/components/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Wrench } from 'lucide-react'

export default function AdminReports() {
  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Operational and management reports for the clinic.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-brand" />
              Reports Module
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm sm:text-base text-gray-600">
            <div className="flex items-start gap-2">
              <Wrench className="h-4 w-4 mt-0.5 text-gray-500 shrink-0" />
              <p>
                Reports page is ready in navigation. You can now plug in KPIs, export tools, and date-range analytics here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

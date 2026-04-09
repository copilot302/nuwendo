import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X, Phone, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false)
  const [mobileAddOnOpen, setMobileAddOnOpen] = useState(false)

  return (
    <>
      {/* Top Bar */}
      <div className="hidden md:block bg-brand-800 text-white py-2">
        <div className="container flex justify-between items-center text-sm">
          <div className="flex items-center gap-6">
            <a href="mailto:info@nuwendo.com" className="flex items-center gap-2 hover:text-brand-200 transition-colors">
              <Mail className="h-4 w-4" />
              info@nuwendo.com
            </a>
            <a href="tel:+639065707915" className="flex items-center gap-2 hover:text-brand-200 transition-colors">
              <Phone className="h-4 w-4" />
              (0906) 570 7915
            </a>
          </div>
          <div className="text-gray-300">
            Makati City, Philippines • Open 7:30 AM - 5:30 PM
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 w-full bg-white shadow-sm">
        <div className="container flex h-20 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-full.svg" alt="Nuwendo Metabolic Clinic" className="h-16" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-gray-700 hover:text-brand transition-colors">
              Home
            </Link>
            <Link to="/about-us" className="text-sm font-medium text-gray-700 hover:text-brand transition-colors">
              About Us
            </Link>

            <div className="relative group">
              <Link to="/services" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-brand transition-colors">
                Services
              </Link>
              <div className="absolute top-full left-0 mt-3 w-56 rounded-xl border border-gray-100 bg-white shadow-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link to="/services/nuwendo-starter" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand">
                  Nuwendo Starter
                </Link>
                <Link to="/services/initial-consultation" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand">
                  Initial Consultation
                </Link>
              </div>
            </div>

            <div className="relative group">
              <Link to="/add-on" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-brand transition-colors">
                Add On
              </Link>
              <div className="absolute top-full left-0 mt-3 w-56 rounded-xl border border-gray-100 bg-white shadow-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <Link to="/add-on/follow-up" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand">
                  Follow Up
                </Link>
                <Link to="/add-on/nutrition-plan" className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-brand-50 hover:text-brand">
                  Nutrition Plan
                </Link>
              </div>
            </div>
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden md:block">
              <Button variant="outline" className="border-brand text-brand hover:bg-brand hover:text-white">
                Login
              </Button>
            </Link>
            <Link to="/signup" className="hidden md:block">
              <Button className="bg-brand hover:bg-brand-600 text-white">
                Get Started
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t">
            <nav className="container py-4 flex flex-col gap-4">
              <Link to="/" className="text-gray-700 hover:text-brand py-2" onClick={() => setMobileMenuOpen(false)}>Home</Link>
              <Link to="/about-us" className="text-gray-700 hover:text-brand py-2" onClick={() => setMobileMenuOpen(false)}>About Us</Link>

              <div>
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-gray-700 hover:text-brand py-2"
                  onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                >
                  <span>Services</span>
                </button>
                {mobileServicesOpen && (
                  <div className="pl-4 border-l border-gray-200 space-y-2 mt-1">
                    <Link to="/services/nuwendo-starter" className="block text-sm text-gray-600 hover:text-brand py-1" onClick={() => setMobileMenuOpen(false)}>
                      Nuwendo Starter
                    </Link>
                    <Link to="/services/initial-consultation" className="block text-sm text-gray-600 hover:text-brand py-1" onClick={() => setMobileMenuOpen(false)}>
                      Initial Consultation
                    </Link>
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-gray-700 hover:text-brand py-2"
                  onClick={() => setMobileAddOnOpen(!mobileAddOnOpen)}
                >
                  <span>Add On</span>
                </button>
                {mobileAddOnOpen && (
                  <div className="pl-4 border-l border-gray-200 space-y-2 mt-1">
                    <Link to="/add-on/follow-up" className="block text-sm text-gray-600 hover:text-brand py-1" onClick={() => setMobileMenuOpen(false)}>
                      Follow Up
                    </Link>
                    <Link to="/add-on/nutrition-plan" className="block text-sm text-gray-600 hover:text-brand py-1" onClick={() => setMobileMenuOpen(false)}>
                      Nutrition Plan
                    </Link>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Link to="/login" className="flex-1">
                  <Button variant="outline" className="w-full border-brand text-brand">Login</Button>
                </Link>
                <Link to="/signup" className="flex-1">
                  <Button className="w-full bg-brand">Get Started</Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  )
}

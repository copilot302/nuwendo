import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Menu, X, Phone, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Top Bar */}
  <div className="hidden md:block bg-[#f0833c] text-white py-2">
        <div className="container flex justify-between items-center text-sm">
          <div className="flex items-center gap-6">
            <a href="mailto:info.nuwendoph@gmail.com" className="flex items-center gap-2 hover:text-brand-200 transition-colors">
              <Mail className="h-4 w-4" />
              info.nuwendoph@gmail.com
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
            <img src="/NUWENDO.svg" alt="Nuwendo Metabolic Clinic" className="h-12 sm:h-16" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-gray-700 hover:text-brand transition-colors">
              Home
            </Link>
            <Link to="/about-us" className="text-sm font-medium text-gray-700 hover:text-brand transition-colors">
              About Us
            </Link>

            <Link to="/services" className="text-sm font-medium text-gray-700 hover:text-brand transition-colors">
              Services
            </Link>

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

              <Link to="/services" className="text-gray-700 hover:text-brand py-2" onClick={() => setMobileMenuOpen(false)}>
                Services
              </Link>

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

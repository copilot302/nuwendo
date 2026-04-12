import { Link } from 'react-router-dom'
import { Mail, MapPin, Facebook, Instagram } from 'lucide-react'
import { motion } from 'framer-motion'

export function Footer() {
  const handleFooterNavClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer className="bg-brand-800 text-white">
      {/* Main Footer */}
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <Link to="/">
              <img src="/NUWENDO.svg" alt="Nuwendo Metabolic Clinic" className="h-16 brightness-0 invert" />
            </Link>
            <p className="text-white/70 leading-relaxed">
              Doctor-led weight loss and metabolic health clinic. Real results. Sustainable change.
            </p>
            <div className="flex gap-4">
              <a 
                href="https://www.facebook.com/nuwendoph" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand transition-colors"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="https://www.instagram.com/nuwendoph" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <h4 className="text-lg font-semibold">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/about-us" onClick={handleFooterNavClick} className="text-white/70 hover:text-brand-300 transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300" />
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/services" onClick={handleFooterNavClick} className="text-white/70 hover:text-brand-300 transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300" />
                  Our Services
                </Link>
              </li>
              <li>
                <Link to="/signup" className="text-white/70 hover:text-brand-300 transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300" />
                  Book Now
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* Services */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <h4 className="text-lg font-semibold">Our Services</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/services" onClick={handleFooterNavClick} className="text-white/70 hover:text-brand-300 transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300" />
                  Nuwendo Starter
                </Link>
              </li>
              <li>
                <Link to="/services" onClick={handleFooterNavClick} className="text-white/70 hover:text-brand-300 transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300" />
                  Nutrition Plan
                </Link>
              </li>
              <li>
                <Link to="/services" onClick={handleFooterNavClick} className="text-white/70 hover:text-brand-300 transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300" />
                  Metabolic Work-up
                </Link>
              </li>
              <li>
                <Link to="/services" onClick={handleFooterNavClick} className="text-white/70 hover:text-brand-300 transition-colors flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-300" />
                  BeFit x Nuwendo
                </Link>
              </li>
            </ul>
          </motion.div>

          {/* Contact Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <h4 className="text-lg font-semibold">Contact Us</h4>
            <ul className="space-y-4">
              <li>
                <a href="mailto:info.nuwendoph@gmail.com" className="text-white/70 hover:text-brand-300 transition-colors flex items-start gap-3">
                  <Mail className="h-5 w-5 text-brand-300 shrink-0 mt-0.5" />
                  <span>info.nuwendoph@gmail.com</span>
                </a>
              </li>
              <li className="flex items-start gap-3 text-white/70">
                <MapPin className="h-5 w-5 text-brand-300 shrink-0 mt-0.5" />
                <span>
                  1771 Nicanor Garcia Street,
                  <br />
                  Makati City, NCR, Philippines.
                </span>
              </li>
            </ul>
          </motion.div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container py-6 flex items-center justify-center">
          <p className="text-white/60 text-sm text-center">
            &copy; {new Date().getFullYear()} Nuwendo Metabolic Clinic. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

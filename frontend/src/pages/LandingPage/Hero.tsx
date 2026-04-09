import { Button } from '@/components/ui/button'
import { ArrowRight, Stethoscope, Heart, ShieldCheck, CalendarClock, ClipboardCheck, MessageSquareHeart } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function Hero() {
  return (
    <section id="home" className="relative bg-gradient-to-br from-brand via-brand-600 to-brand-800 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-200 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-300 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8 max-w-3xl"
          >
            <div className="space-y-4">
              <p className="text-brand-200 font-medium tracking-wider uppercase text-sm">
                Welcome to Nuwendo
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                Doctor-Led
                <br />
                <span className="text-brand-200">Weight Loss</span>
                <br />
                & Metabolic Health
              </h1>
              <p className="text-lg text-gray-300 max-w-lg">
                Experience a different way to lose weight. We work with your biology — that makes all the difference.
              </p>
            </div>

            <div>
              <Link to="/signup">
                <Button size="lg" className="bg-brand hover:bg-brand-600 text-white gap-2 w-full sm:w-auto">
                  Book Consultation
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <ShieldCheck className="h-5 w-5 text-brand-200" />
                <span>Licensed Physicians</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Stethoscope className="h-5 w-5 text-brand-200" />
                <span>Personalized Care</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Heart className="h-5 w-5 text-brand-200" />
                <span>Science-Backed</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-3xl p-6 lg:p-8"
          >
            <p className="text-brand-200 text-sm font-semibold uppercase tracking-wider mb-4">
              How your care starts
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <CalendarClock className="h-5 w-5 text-brand-200" />
                </div>
                <div>
                  <p className="font-semibold">Book your consultation</p>
                  <p className="text-sm text-gray-300">Choose your preferred schedule online in minutes.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <ClipboardCheck className="h-5 w-5 text-brand-200" />
                </div>
                <div>
                  <p className="font-semibold">Get assessed by our team</p>
                  <p className="text-sm text-gray-300">We review your history, goals, and current health profile.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <MessageSquareHeart className="h-5 w-5 text-brand-200" />
                </div>
                <div>
                  <p className="font-semibold">Follow a personalized plan</p>
                  <p className="text-sm text-gray-300">Start a doctor-led program tailored to your needs.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
        </svg>
      </div>
    </section>
  )
}

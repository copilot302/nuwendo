import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Heart, Shield, Clock, MessageCircle } from 'lucide-react'
import { BASE_URL } from '@/config/api'

export default function SignUp() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsLoading(true)

    try {
      console.log('Sending verification code request...')
      
      // Add timeout to fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      const response = await fetch(`${BASE_URL}/api/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      const data = await response.json()
      console.log('Response received:', data)

      if (!response.ok) {
        // If user already exists, redirect to login
        if (data.shouldLogin) {
          setError('')
          setSuccessMessage('Account already exists! Redirecting to login...')
          // Store email and redirect to login
          sessionStorage.setItem('loginEmail', email)
          setTimeout(() => {
            navigate('/login')
          }, 2000)
          return
        }
        throw new Error(data.message || 'Failed to send verification code')
      }

      sessionStorage.setItem('signupEmail', email)
      
      // If email service failed and code is provided in response, store it
      console.log('Checking for code in response:', data.data)
      if (data.data?.code) {
        console.log('Code found, storing:', data.data.code)
        sessionStorage.setItem('tempVerificationCode', data.data.code)
        alert(`Email service is temporarily down. Your verification code is: ${data.data.code}\n\nIt will be auto-filled on the next page.`)
      }
      
      navigate('/verify-code')
    } catch (err) {
      console.error('Signup error:', err)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const features = [
    { icon: Clock, text: 'Book consultations at your convenience' },
    { icon: Shield, text: 'Your health data is secure and private' },
    { icon: Heart, text: 'Personalized care plans just for you' },
    { icon: MessageCircle, text: '24/7 support for all your questions' }
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex"
    >
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 bg-white">
        <div className="w-full max-w-lg mx-auto">
          {/* Logo */}
          <div className="mb-10">
            <img src="/logo-full.svg" alt="Nuwendo Metabolic Clinic" className="h-16" />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
              Your health journey{' '}
              <span className="text-brand">starts here</span>
            </h1>
            <p className="text-lg text-gray-600">
              Enter your email to get started. We'll send you a verification code.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 text-base"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{successMessage}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-base bg-brand hover:bg-brand-600"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending code...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>

          {/* Already have an account */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-brand hover:text-brand-600 font-medium"
              >
                Log in
              </button>
            </p>
          </div>

          {/* Features */}
          <div className="mt-12 grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                  <feature.icon className="w-4 h-4 text-brand" />
                </div>
                <span className="text-sm text-gray-600 leading-tight">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-brand via-brand-600 to-brand-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/5 rounded-full" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white text-center">
          <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mb-8 backdrop-blur-sm">
            <Heart className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Healthcare made simple</h2>
          <p className="text-lg text-white/80 max-w-md">
            Book appointments, access your records, and connect with healthcare providers all in one place.
          </p>
          
          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold">500+</div>
              <div className="text-sm text-white/70">Providers</div>
            </div>
            <div>
              <div className="text-4xl font-bold">50k+</div>
              <div className="text-sm text-white/70">Patients</div>
            </div>
            <div>
              <div className="text-4xl font-bold">4.9</div>
              <div className="text-sm text-white/70">Rating</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Heart, Shield, Clock, MessageCircle, RefreshCw } from 'lucide-react'
import { BASE_URL } from '@/config/api'

export default function Login() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email')
  const [email, setEmail] = useState(sessionStorage.getItem('loginEmail') || '')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [_isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (step === 'code') {
      inputRefs.current[0]?.focus()
      
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [step])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      console.log('Sending login code request...')
      
      // Add timeout to fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      const response = await fetch(`${BASE_URL}/api/auth/patient-login/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      const data = await response.json()
      console.log('Login response received:', data)

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification code')
      }

      // Check if this is an admin account
      if (data.isAdmin) {
        setIsAdmin(true)
        setStep('password')
      } else {
        setIsAdmin(false)
        sessionStorage.setItem('loginEmail', email)
        
        // If email service failed and code is provided in response, store it
        console.log('Checking for code in login response:', data.data)
        if (data.data?.code) {
          console.log('Code found in login, storing:', data.data.code)
          sessionStorage.setItem('tempLoginCode', data.data.code)
          alert(`Email service is temporarily down. Your verification code is: ${data.data.code}\n\nIt will be auto-filled.`)
          
          // Auto-fill the code
          const digits = data.data.code.split('')
          setCode(digits)
        }
        
        setStep('code')
        setTimeLeft(60)
      }
    } catch (err: any) {
      console.error('Login email submit error:', err)
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again.')
      } else {
        setError(err.message || 'Failed to send verification code')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAdminPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(`${BASE_URL}/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Invalid email or password')
      }

      // Store admin token and redirect to admin dashboard
      localStorage.setItem('adminToken', data.data.token)
      localStorage.setItem('adminUser', JSON.stringify(data.data.admin))
      
      navigate('/admin/dashboard')
    } catch (err: any) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const newCode = [...code]
    newCode[index] = value.slice(-1)
    setCode(newCode)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newCode = [...code]
    pastedData.split('').forEach((char, i) => {
      if (i < 6) newCode[i] = char
    })
    setCode(newCode)
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length !== 6) return

    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(`${BASE_URL}/api/auth/patient-login/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Invalid verification code')
      }

      console.log('Login response:', data)
      console.log('Token path data.data.token:', data.data?.token)
      console.log('Token path data.token:', data.token)

      sessionStorage.setItem('patientEmail', email)
  localStorage.setItem('patientEmail', email)
      localStorage.setItem('authToken', data.data.token)
      sessionStorage.setItem('authToken', data.data.token)
      sessionStorage.setItem('isAuthenticated', 'true')
  localStorage.setItem('isAuthenticated', 'true')
      
      console.log('Token stored in sessionStorage:', sessionStorage.getItem('authToken'))
      
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setIsResending(true)
    setError('')
    try {
      console.log('Resending login code...')
      
      // Add timeout to fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      const response = await fetch(`${BASE_URL}/api/auth/patient-login/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      const data = await response.json()
      console.log('Resend login response received:', data)
      
      if (!response.ok) throw new Error('Failed to resend code')
      
      // If email service failed and code is provided in response, auto-fill it
      console.log('Checking for code in resend login response:', data.data)
      if (data.data?.code) {
        console.log('Code found in resend login, auto-filling:', data.data.code)
        alert(`Email service is temporarily down. Your verification code is: ${data.data.code}`)
        const digits = data.data.code.split('')
        setCode(digits)
      } else {
        setCode(['', '', '', '', '', ''])
      }
      
      setTimeLeft(60)
    } catch (err: any) {
      console.error('Resend login error:', err)
      if (err.name === 'AbortError') {
        setError('Request timed out. Please try again.')
      } else {
        setError(err.message || 'Failed to resend verification code')
      }
    } finally {
      setIsResending(false)
    }
  }

  const features = [
    { icon: Clock, text: 'Quick and easy appointment booking' },
    { icon: Shield, text: 'Your health data is secure and private' },
    { icon: Heart, text: 'Access your personalized care plans' },
    { icon: MessageCircle, text: 'View your consultation history' }
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

          {step === 'email' ? (
            <>
              {/* Heading */}
              <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
                  Welcome back to{' '}
                  <span className="text-brand">Nuwendo</span>
                </h1>
                <p className="text-lg text-gray-600">
                  Enter your email to sign in. We'll send you a verification code.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-5">
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

              {/* Don't have an account */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{' '}
                  <button
                    onClick={() => navigate('/signup')}
                    className="text-brand hover:text-brand-600 font-medium"
                  >
                    Sign up
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
            </>
          ) : step === 'password' ? (
            <>
              {/* Admin Password Step */}
              <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
                  Admin Login
                </h1>
                <p className="text-lg text-gray-600">
                  Logging in as{' '}
                  <span className="font-medium text-gray-900">{email}</span>
                </p>
              </div>

              <form onSubmit={handleAdminPasswordSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 text-base"
                    required
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base bg-brand hover:bg-brand-600"
                  disabled={isLoading || !password}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setStep('email')
                    setPassword('')
                    setError('')
                  }}
                  className="w-full"
                >
                  Back to email
                </Button>
              </form>
            </>
          ) : (
            <>
              {/* Verification Code Step */}
              <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
                  Check your email
                </h1>
                <p className="text-lg text-gray-600">
                  We've sent a 6-digit verification code to{' '}
                  <span className="font-medium text-gray-900">{email}</span>
                </p>
              </div>

              <form onSubmit={handleCodeSubmit} className="space-y-6">
                {/* Code Input Boxes */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Enter verification code
                  </Label>
                  <div className="flex gap-3 justify-between" onPaste={handlePaste}>
                    {code.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-12 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-xl focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                        disabled={isLoading}
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base bg-brand hover:bg-brand-600"
                  disabled={isLoading || code.join('').length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              {/* Resend Code */}
              <div className="mt-8 text-center">
                {timeLeft > 0 ? (
                  <p className="text-sm text-gray-500">
                    Resend code in <span className="font-medium text-gray-900">{timeLeft}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResendCode}
                    disabled={isResending}
                    className="inline-flex items-center gap-2 text-sm text-brand hover:text-brand-600 font-medium disabled:opacity-50"
                  >
                    {isResending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Resend verification code
                  </button>
                )}
              </div>

              {/* Back to email */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setStep('email')
                    setCode(['', '', '', '', '', ''])
                    setError('')
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  ← Use a different email
                </button>
              </div>
            </>
          )}
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
          <h2 className="text-3xl font-bold mb-4">Welcome back!</h2>
          <p className="text-lg text-white/80 max-w-md">
            Continue your health journey with Nuwendo. Access your appointments, prescriptions, and more.
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

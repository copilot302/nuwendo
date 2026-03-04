import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, RefreshCw, Mail } from 'lucide-react'
import { BASE_URL } from '@/config/api'

export default function VerifyCode() {
  const navigate = useNavigate()
  const email = sessionStorage.getItem('signupEmail') || ''
  
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!email) {
      navigate('/signup')
      return
    }
    
    // Check if there's a temporary verification code (in case email service failed)
    const tempCode = sessionStorage.getItem('tempVerificationCode')
    if (tempCode && tempCode.length === 6) {
      const digits = tempCode.split('')
      setCode(digits)
      sessionStorage.removeItem('tempVerificationCode')
    } else {
      inputRefs.current[0]?.focus()
    }
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    
    return () => clearInterval(timer)
  }, [email, navigate])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length !== 6) return

    setError('')
    setIsLoading(true)

    try {
      const response = await fetch(`${BASE_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Invalid verification code')
      }

      sessionStorage.setItem('verificationCode', fullCode)
      navigate('/patient-details')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (timeLeft > 0) return
    setIsResending(true)
    
    try {
      console.log('Resending verification code...')
      
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
      console.log('Resend response received:', data)
      
      if (response.ok) {
        // If email service failed and code is provided in response, auto-fill it
        console.log('Checking for code in resend response:', data.data)
        if (data.data?.code) {
          console.log('Code found in resend, auto-filling:', data.data.code)
          alert(`Email service is temporarily down. Your verification code is: ${data.data.code}`)
          const digits = data.data.code.split('')
          setCode(digits)
        } else {
          setCode(['', '', '', '', '', ''])
        }
        
        setTimeLeft(60)
        setError('')
      }
    } catch (err) {
      console.error('Resend error:', err)
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please try again.')
      } else {
        setError('Failed to resend code')
      }
    } finally {
      setIsResending(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex"
    >
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 bg-white">
        <div className="w-full max-w-lg mx-auto">
          {/* Back Button & Logo */}
          <div className="mb-10 flex items-center justify-between">
            <button
              onClick={() => navigate('/signup')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <img src="/logo-icon.svg" alt="Nuwendo" className="h-12 w-12" />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
              Check your email
            </h1>
            <p className="text-lg text-gray-600">
              We sent a 6-digit code to <span className="font-medium text-gray-900">{email}</span>
            </p>
          </div>

          {/* Code Input */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-between gap-2 sm:gap-4">
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
                  onPaste={handlePaste}
                  className="w-12 h-14 sm:w-16 sm:h-18 text-center text-2xl font-bold border-2 rounded-xl focus:border-brand focus:ring-4 focus:ring-brand-100 outline-none transition-all"
                  disabled={isLoading}
                />
              ))}
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
                'Verify & Continue'
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={timeLeft > 0 || isResending}
                className="text-sm text-brand hover:text-brand-600 disabled:text-gray-400 flex items-center justify-center gap-2 mx-auto transition-colors"
              >
                {isResending && <RefreshCw className="h-3 w-3 animate-spin" />}
                {timeLeft > 0 ? `Resend code in ${timeLeft}s` : 'Resend code'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-brand via-brand-600 to-brand-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white text-center">
          <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mb-8 backdrop-blur-sm">
            <Mail className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Almost there!</h2>
          <p className="text-lg text-white/80 max-w-md">
            Enter the verification code we just sent to your email to continue with your booking.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

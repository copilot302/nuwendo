import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2, User } from 'lucide-react'
import { BASE_URL } from '@/config/api'
import { addressService } from '@/services/addressService'
import {
  getPhilippinePhoneValidationMessage,
  maskPhilippinePhone,
  normalizePhilippinePhone
} from '@/lib/phone'

export default function PatientDetails() {
  const navigate = useNavigate()
  const email = sessionStorage.getItem('signupEmail') || ''
  const code = sessionStorage.getItem('verificationCode') || ''
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    contactNumber: '',
    region: '',
    province: '',
    city: '',
    barangay: '',
    streetAddress: '',
    height: '',
    weight: '',
    reasonForConsult: '',
    healthGoals: [] as string[]
  })

  const [regions, setRegions] = useState<Array<{code: string, name: string}>>([])
  const [provinces, setProvinces] = useState<Array<{code: string, name: string}>>([])
  const [cities, setCities] = useState<Array<{code: string, name: string}>>([])
  const [barangays, setBarangays] = useState<Array<{code: string, name: string}>>([])
  const [selectedRegionCode, setSelectedRegionCode] = useState('')
  const [selectedProvinceCode, setSelectedProvinceCode] = useState('')
  const [selectedCityCode, setSelectedCityCode] = useState('')

  useEffect(() => {
    loadRegions()
  }, [])

  useEffect(() => {
    if (!email || !code) {
      navigate('/signup', { replace: true })
    }
  }, [email, code, navigate])

  const loadRegions = async () => {
    try {
      const data = await addressService.getRegions()
      setRegions(data)
    } catch (err) {
      console.error('Failed to load regions:', err)
    }
  }

  const handleRegionChange = async (regionCode: string) => {
    setSelectedRegionCode(regionCode)
    const region = regions.find(r => r.code === regionCode)
    setFormData({ ...formData, region: region?.name || '', province: '', city: '', barangay: '' })
    setSelectedProvinceCode('')
    setSelectedCityCode('')
    setProvinces([])
    setCities([])
    setBarangays([])
    try {
      const provincesData = await addressService.getProvinces(regionCode)
      setProvinces(provincesData)
    } catch (err) {
      console.error('Failed to load provinces:', err)
    }
  }

  const handleProvinceChange = async (provinceCode: string) => {
    setSelectedProvinceCode(provinceCode)
    const province = provinces.find(p => p.code === provinceCode)
    setFormData({ ...formData, province: province?.name || '', city: '', barangay: '' })
    setSelectedCityCode('')
    setCities([])
    setBarangays([])
    try {
      const citiesData = await addressService.getCities(provinceCode)
      setCities(citiesData)
    } catch (err) {
      console.error('Failed to load cities:', err)
    }
  }

  const handleCityChange = async (cityCode: string) => {
    setSelectedCityCode(cityCode)
    const city = cities.find(c => c.code === cityCode)
    setFormData({ ...formData, city: city?.name || '', barangay: '' })
    setBarangays([])
    try {
      const barangaysData = await addressService.getBarangays(cityCode)
      setBarangays(barangaysData)
    } catch (err) {
      console.error('Failed to load barangays:', err)
    }
  }

  const handleBarangayChange = (barangayName: string) => {
    setFormData({ ...formData, barangay: barangayName })
  }

  const healthGoalOptions = [
    'Weight loss / fat loss',
    'Improve energy / reduce fatigue',
    'Blood sugar control / insulin resistance',
    'Hormonal balance',
    'Thyroid health',
    'Improve digestion / gut health',
    'Body recomposition / gain muscle',
    'Reduce cravings / appetite control',
    'Long term metabolic health',
    'Considering weight loss medications'
  ]

  const handleHealthGoalToggle = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      healthGoals: prev.healthGoals.includes(goal)
        ? prev.healthGoals.filter(g => g !== goal)
        : [...prev.healthGoals, goal]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const phoneValidationMessage = getPhilippinePhoneValidationMessage(formData.contactNumber)
    if (phoneValidationMessage) {
      setPhoneError(phoneValidationMessage)
      setError(phoneValidationMessage)
      return
    }

    const normalizedPhone = normalizePhilippinePhone(formData.contactNumber)
    if (!normalizedPhone) {
      setPhoneError('Please enter a valid Philippine mobile number (e.g., 0912 345 6789).')
      setError('Please enter a valid Philippine mobile number (e.g., 0912 345 6789).')
      return
    }
    
    if (formData.healthGoals.length === 0) {
      setError('Please select at least one health goal')
      return
    }

    if (!formData.region || !formData.province || !formData.city || !formData.barangay || !formData.streetAddress) {
      setError('Please complete all address fields')
      return
    }
    
    setError('')
    setPhoneError('')
    setIsLoading(true)

    try {
      // Store patient details in session
      const payload = {
        ...formData,
        contactNumber: normalizedPhone
      }

      sessionStorage.setItem('patientDetails', JSON.stringify(payload))
      
      // Save to backend
      const response = await fetch(`${BASE_URL}/api/patient/profile/${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: normalizedPhone,
          address: `${formData.streetAddress}, ${formData.barangay}, ${formData.city}, ${formData.province}, ${formData.region}`,
          region: formData.region,
          province: formData.province,
          city: formData.city,
          barangay: formData.barangay,
          street_address: formData.streetAddress,
          age: formData.age,
          height: formData.height,
          weight: formData.weight,
          reasonForConsult: formData.reasonForConsult,
          healthGoals: formData.healthGoals
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        console.error('Profile save failed:', response.status, errData)
        setError('Failed to save your details. Please try again.')
        return
      }
      
      // Navigate to choose service
      navigate('/choose-service')
    } catch (err) {
      console.error('Profile save error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!email || !code) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex"
    >
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col px-6 sm:px-12 lg:px-20 py-12 bg-white overflow-auto">
        <div className="w-full max-w-2xl mx-auto">
          {/* Back Button & Logo */}
          <div className="mb-8 flex items-center justify-between">
            <button
              onClick={() => navigate('/verify-code')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <img src="/logo-icon.svg" alt="Nuwendo" className="h-12 w-12" />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-2">
              Tell us about yourself
            </h1>
            <p className="text-lg text-gray-600">
              Help us personalize your healthcare experience
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Age and Contact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="25"
                  min="1"
                  max="150"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number *</Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  placeholder="0912 345 6789"
                  value={formData.contactNumber}
                  onChange={(e) => {
                    const maskedPhone = maskPhilippinePhone(e.target.value)
                    setFormData({ ...formData, contactNumber: maskedPhone })
                    if (phoneError) setPhoneError('')
                    if (error) setError('')
                  }}
                  onBlur={() => {
                    const validationMessage = getPhilippinePhoneValidationMessage(formData.contactNumber)
                    setPhoneError(validationMessage)
                  }}
                  maxLength={13}
                  required
                />
                {phoneError ? (
                  <p className="text-xs text-red-600">{phoneError}</p>
                ) : (
                  <p className="text-xs text-gray-500">Use PH format: 0912 345 6789</p>
                )}
              </div>
            </div>

            {/* Address Fields */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Complete Address *</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Select value={selectedRegionCode} onValueChange={handleRegionChange}>
                    <SelectTrigger id="region">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region.code} value={region.code}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Select value={selectedProvinceCode} onValueChange={handleProvinceChange} disabled={!selectedRegionCode}>
                    <SelectTrigger id="province">
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((province) => (
                        <SelectItem key={province.code} value={province.code}>
                          {province.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City/Municipality</Label>
                  <Select value={selectedCityCode} onValueChange={handleCityChange} disabled={!selectedProvinceCode}>
                    <SelectTrigger id="city">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.code} value={city.code}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barangay">Barangay</Label>
                  <Select value={formData.barangay} onValueChange={handleBarangayChange} disabled={!selectedCityCode}>
                    <SelectTrigger id="barangay">
                      <SelectValue placeholder="Select barangay" />
                    </SelectTrigger>
                    <SelectContent>
                      {barangays.map((barangay) => (
                        <SelectItem key={barangay.code} value={barangay.name}>
                          {barangay.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="streetAddress">House/Building No., Street Name *</Label>
                <Input
                  id="streetAddress"
                  placeholder="e.g., 123 Main Street, Building A"
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Height and Weight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm) *</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="170"
                  min="50"
                  max="300"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg) *</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="70"
                  min="20"
                  max="500"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Reason for Consult */}
            <div className="space-y-2">
              <Label htmlFor="reasonForConsult">Reason for Consult *</Label>
              <Textarea
                id="reasonForConsult"
                placeholder="Please describe your primary reason for seeking consultation..."
                value={formData.reasonForConsult}
                onChange={(e) => setFormData({ ...formData, reasonForConsult: e.target.value })}
                className="min-h-[100px]"
                required
              />
            </div>

            {/* Health Goals */}
            <div className="space-y-3">
              <Label>Health Goals * (Select all that apply)</Label>
              <div className="space-y-3 bg-gray-50 rounded-xl p-4">
                {healthGoalOptions.map((goal) => (
                  <div key={goal} className="flex items-start gap-3">
                    <Checkbox
                      id={goal}
                      checked={formData.healthGoals.includes(goal)}
                      onCheckedChange={() => handleHealthGoalToggle(goal)}
                    />
                    <label
                      htmlFor={goal}
                      className="text-sm leading-tight cursor-pointer"
                    >
                      {goal}
                    </label>
                  </div>
                ))}
              </div>
              {formData.healthGoals.length > 0 && (
                <p className="text-sm text-brand">
                  {formData.healthGoals.length} goal{formData.healthGoals.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 text-base bg-brand hover:bg-brand-600"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Continue'
              )}
            </Button>
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
            <User className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Personalized Care</h2>
          <p className="text-lg text-white/80 max-w-md">
            Your health information helps us create a customized care plan tailored to your unique needs and goals.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

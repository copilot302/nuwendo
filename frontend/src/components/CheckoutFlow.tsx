import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Upload, CheckCircle } from 'lucide-react'
import { addressService } from '@/services/addressService'
import { cartService, Cart as CartType } from '@/services/cartService'
import { API_URL } from '@/config/api'

interface CheckoutFlowProps {
  cart: CartType
  onBack: () => void
  onSuccess: () => void
}

interface Province {
  code: string
  name: string
}

interface City {
  code: string
  name: string
}

interface Barangay {
  code: string
  name: string
}

interface PatientProfile {
  firstName?: string
  lastName?: string
  phone?: string
  region?: string
  province?: string
  city?: string
  barangay?: string
  street_address?: string
}

export default function CheckoutFlow({ cart, onBack, onSuccess }: CheckoutFlowProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Address state
  const [useDefaultAddress, setUseDefaultAddress] = useState(true)
  const [defaultProfile, setDefaultProfile] = useState<PatientProfile | null>(null)
  const [regions, setRegions] = useState<Province[]>([])
  const [provinces, setProvinces] = useState<Province[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [barangays, setBarangays] = useState<Barangay[]>([])
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedProvince, setSelectedProvince] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedBarangay, setSelectedBarangay] = useState('')
  const [streetAddress, setStreetAddress] = useState('')

  // Order details
  const [notes, setNotes] = useState('')

  // Payment state
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [paymentSettings, setPaymentSettings] = useState<{
    payment_qr_code?: string
    payment_instructions?: string
    payment_account_name?: string
    payment_account_number?: string
  }>({})

  // Load default address and provinces on mount
  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [regionsData, profile, pmtSettings] = await Promise.all([
        addressService.getRegions(),
        loadDefaultProfile(),
        loadPaymentSettings()
      ])
      setRegions(regionsData)
      setDefaultProfile(profile)
      setPaymentSettings(pmtSettings)
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadPaymentSettings = async () => {
    try {
      const response = await fetch(`${API_URL}/shop/payment-settings`)
      const data = await response.json()
      if (data.success) return data.settings || {}
      return {}
    } catch {
      return {}
    }
  }

  const loadDefaultProfile = async (): Promise<PatientProfile> => {
    const email = sessionStorage.getItem('patientEmail')
    if (!email) {
      console.warn('No patient email found in session')
      return {}
    }
    
    const authToken = sessionStorage.getItem('authToken')
    const response = await fetch(`${API_URL}/patient/profile?email=${encodeURIComponent(email)}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    if (data.success) {
      const p = data.profile || {}
      return {
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        phone: p.phone || '',
        region: p.region || '',
        province: p.province || '',
        city: p.city || '',
        barangay: p.barangay || '',
        street_address: p.street_address || '',
      }
    }
    return {}
  }

  const handleRegionChange = async (regionCode: string) => {
    setSelectedRegion(regionCode)
    setSelectedProvince('')
    setSelectedCity('')
    setSelectedBarangay('')
    setProvinces([])
    setCities([])
    setBarangays([])
    try {
      const provincesData = await addressService.getProvinces(regionCode)
      setProvinces(provincesData)
    } catch (err: any) {
      setError(err.message || 'Failed to load provinces')
    }
  }

  const handleProvinceChange = async (provinceCode: string) => {
    setSelectedProvince(provinceCode)
    setSelectedCity('')
    setSelectedBarangay('')
    setCities([])
    setBarangays([])
    try {
      const citiesData = await addressService.getCities(provinceCode)
      setCities(citiesData)
    } catch (err: any) {
      setError(err.message || 'Failed to load cities')
    }
  }

  const handleCityChange = async (cityCode: string) => {
    setSelectedCity(cityCode)
    setSelectedBarangay('')
    setBarangays([])
    try {
      const barangaysData = await addressService.getBarangays(cityCode)
      setBarangays(barangaysData)
    } catch (err: any) {
      setError(err.message || 'Failed to load barangays')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setReceiptFile(file)
      setReceiptPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    
    const authToken = sessionStorage.getItem('authToken')
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    })
    
    const data = await response.json()
    if (!data.success) throw new Error(data.message || 'Upload failed')
    return data.url
  }

  const handleSubmitOrder = async () => {
    try {
      setLoading(true)
      setError(null)

      // Validate required fields
      if (!useDefaultAddress) {
        if (!selectedRegion || !selectedProvince || !selectedCity || !selectedBarangay || !streetAddress) {
          setError('Please complete all address fields')
          return
        }
      } else {
        if (!defaultProfile?.province || !defaultProfile?.city || !defaultProfile?.barangay) {
          setError('Your default address is incomplete. Please use custom address.')
          return
        }
      }

      if (!receiptFile) {
        setError('Please upload your payment receipt')
        return
      }

      // Upload receipt image
      let receiptUrl = ''
      receiptUrl = await uploadImage(receiptFile)

      // Submit order
      const checkoutData = {
        notes,
        payment_receipt_url: receiptUrl,
        use_default_address: useDefaultAddress,
        delivery_region: useDefaultAddress 
          ? defaultProfile?.region 
          : regions.find(r => r.code === selectedRegion)?.name || selectedRegion,
        delivery_province: useDefaultAddress 
          ? defaultProfile?.province 
          : provinces.find(p => p.code === selectedProvince)?.name || selectedProvince,
        delivery_city: useDefaultAddress 
          ? defaultProfile?.city 
          : cities.find(c => c.code === selectedCity)?.name || selectedCity,
        delivery_barangay: useDefaultAddress 
          ? defaultProfile?.barangay 
          : barangays.find(b => b.code === selectedBarangay)?.name || selectedBarangay,
        delivery_street_address: useDefaultAddress ? defaultProfile?.street_address : streetAddress
      }

      await cartService.checkout(checkoutData)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  const canProceedFromStep1 = () => {
    if (useDefaultAddress) {
      // Allow proceeding if at least province and city are set (region may be missing from old data)
      return defaultProfile?.province && defaultProfile?.city && defaultProfile?.barangay
    }
    // For custom address, check that we have region, province, city, barangay, and street
    return selectedRegion && selectedProvince && selectedCity && selectedBarangay && streetAddress.trim() && 
           regions.find(r => r.code === selectedRegion) && 
           provinces.find(p => p.code === selectedProvince) && 
           cities.find(c => c.code === selectedCity) && 
           barangays.find(b => b.code === selectedBarangay)
  }

  const canProceedFromStep3 = () => {
    return receiptFile !== null
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center">
        {[1, 2, 3].map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                s < step ? 'bg-green-500 text-white' : s === step ? 'bg-brand text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s < step ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              <span className={`mt-1 text-xs ${s === step ? 'font-semibold text-brand' : 'text-gray-500'}`}>
                {s === 1 ? 'Delivery' : s === 2 ? 'Review' : 'Payment'}
              </span>
            </div>
            {i < 2 && (
              <div className={`flex-1 h-1 mx-2 mb-4 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-4"
      >
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Delivery Address</h3>

            {/* Recipient Info */}
            <div className="p-3 border rounded-lg bg-gray-50 space-y-1">
              <h4 className="text-sm font-medium text-gray-700">Recipient</h4>
              {defaultProfile?.firstName || defaultProfile?.lastName ? (
                <p className="text-sm">{[defaultProfile.firstName, defaultProfile.lastName].filter(Boolean).join(' ')}</p>
              ) : (
                <p className="text-sm text-amber-600">Name not set in your profile</p>
              )}
              {defaultProfile?.phone ? (
                <p className="text-sm text-gray-600">{defaultProfile.phone}</p>
              ) : (
                <p className="text-sm text-amber-600">Phone number not set in your profile</p>
              )}
            </div>
            
            <RadioGroup value={useDefaultAddress ? 'default' : 'custom'} onValueChange={(val: string) => setUseDefaultAddress(val === 'default')}>
              <div className="space-y-3">
                <div className="flex items-start space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="default" id="default" />
                  <div className="flex-1">
                    <Label htmlFor="default" className="font-medium cursor-pointer">
                      Use Default Address
                    </Label>
                    {defaultProfile && defaultProfile.province ? (
                      <p className="text-sm text-gray-600 mt-1">
                        {defaultProfile.street_address && `${defaultProfile.street_address}, `}
                        {defaultProfile.barangay}, {defaultProfile.city}, {defaultProfile.province}
                      </p>
                    ) : (
                      <p className="text-sm text-amber-600 mt-1">
                        No default address set. Please select custom address.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="font-medium cursor-pointer">
                    Use Different Address
                  </Label>
                </div>
              </div>
            </RadioGroup>

            {!useDefaultAddress && (
              <div className="space-y-3 pl-6">
                <div>
                  <Label htmlFor="region">Region</Label>
                  <Select value={selectedRegion} onValueChange={handleRegionChange}>
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

                <div>
                  <Label htmlFor="province">Province</Label>
                  <Select value={selectedProvince} onValueChange={handleProvinceChange} disabled={!selectedRegion}>
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

                <div>
                  <Label htmlFor="city">City/Municipality</Label>
                  <Select value={selectedCity} onValueChange={handleCityChange} disabled={!selectedProvince}>
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

                <div>
                  <Label htmlFor="barangay">Barangay</Label>
                  <Select value={selectedBarangay} onValueChange={setSelectedBarangay} disabled={!selectedCity}>
                    <SelectTrigger id="barangay">
                      <SelectValue placeholder="Select barangay" />
                    </SelectTrigger>
                    <SelectContent>
                      {barangays.map((barangay) => (
                        <SelectItem key={barangay.code} value={barangay.code}>
                          {barangay.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="street">House/Building No., Street Name</Label>
                  <Input
                    id="street"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g., 123 Main Street, Building A"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Review Order</h3>

            <div className="space-y-2 border rounded-lg p-4">
              <h4 className="font-medium text-sm text-gray-700">Order Items</h4>
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.item.name}</p>
                    {item.variant && <p className="text-gray-600 text-xs">{item.variant.name}</p>}
                    <p className="text-gray-600 text-xs">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium">₱{item.subtotal.toLocaleString()}</p>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-semibold">
                <p>Total</p>
                <p className="text-brand">₱{cart.total.toLocaleString()}</p>
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="font-medium text-sm text-gray-700 mb-2">Delivery Details</h4>
              {(defaultProfile?.firstName || defaultProfile?.lastName) && (
                <p className="text-sm font-medium">
                  {[defaultProfile.firstName, defaultProfile.lastName].filter(Boolean).join(' ')}
                </p>
              )}
              {defaultProfile?.phone && (
                <p className="text-sm text-gray-600 mb-1">{defaultProfile.phone}</p>
              )}
              <p className="text-sm">
                {useDefaultAddress ? (
                  <>
                    {defaultProfile?.street_address && `${defaultProfile.street_address}, `}
                    {defaultProfile?.barangay}, {defaultProfile?.city}, {defaultProfile?.province}, {defaultProfile?.region}
                  </>
                ) : (
                  <>
                    {streetAddress}, {barangays.find(b => b.code === selectedBarangay)?.name || selectedBarangay},{' '}
                    {cities.find(c => c.code === selectedCity)?.name || selectedCity},{' '}
                    {provinces.find(p => p.code === selectedProvince)?.name || selectedProvince},{' '}
                    {regions.find(r => r.code === selectedRegion)?.name || selectedRegion}
                  </>
                )}
              </p>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions..."
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Payment</h3>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Payment Instructions</h4>
              {paymentSettings.payment_instructions ? (
                <p className="text-sm text-blue-900 whitespace-pre-line">{paymentSettings.payment_instructions}</p>
              ) : (
                <ol className="text-sm text-blue-900 space-y-1 list-decimal list-inside">
                  <li>Scan the QR code below to pay</li>
                  <li>Take a screenshot of your payment confirmation</li>
                  <li>Upload your payment receipt for verification</li>
                </ol>
              )}
            </div>

            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium text-sm mb-2">Scan to Pay</h4>
              {paymentSettings.payment_qr_code ? (
                <div className="flex flex-col items-center gap-2">
                  <img 
                    src={paymentSettings.payment_qr_code} 
                    alt="Payment QR Code" 
                    className="w-48 h-48 object-contain rounded-lg border bg-white"
                  />
                  {paymentSettings.payment_account_name && (
                    <p className="text-sm font-medium text-gray-700">{paymentSettings.payment_account_name}</p>
                  )}
                  {paymentSettings.payment_account_number && (
                    <p className="text-sm text-gray-600">{paymentSettings.payment_account_number}</p>
                  )}
                </div>
              ) : (
                <div className="bg-white p-4 rounded-lg border-2 border-dashed">
                  <p className="text-center text-gray-500 text-sm">
                    QR Code not yet configured
                  </p>
                  <p className="text-center text-xs text-gray-400 mt-2">
                    Please contact the clinic for payment details
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="receipt-upload">Upload Payment Receipt *</Label>
              <div className="mt-2">
                <input
                  id="receipt-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e)}
                  className="hidden"
                />
                <label
                  htmlFor="receipt-upload"
                  className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm">
                    {receiptFile ? receiptFile.name : 'Click to upload receipt'}
                  </span>
                </label>
                {receiptPreview && (
                  <div className="mt-2">
                    <img src={receiptPreview} alt="Receipt Preview" className="w-32 h-32 object-cover rounded border" />
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                Your order will be processed after payment verification by our admin team.
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4 border-t">
        <Button
          onClick={step === 1 ? onBack : () => setStep(step - 1)}
          variant="outline"
          className="flex-1"
          disabled={loading}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        
        {step < 3 ? (
          <Button
            onClick={() => setStep(step + 1)}
            className="flex-1 bg-brand hover:bg-brand/90"
            disabled={step === 1 && !canProceedFromStep1()}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmitOrder}
            className="flex-1 bg-brand hover:bg-brand/90"
            disabled={loading || !canProceedFromStep3()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              'Place Order'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

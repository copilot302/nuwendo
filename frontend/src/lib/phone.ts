export const PH_PHONE_DIGITS = 11

const extractDigits = (value: string): string => value.replace(/\D/g, '')

export const normalizePhilippinePhone = (value: string): string | null => {
  const trimmed = value.trim()

  if (!trimmed) return null

  const startsWithPlus = trimmed.startsWith('+')
  const digits = extractDigits(trimmed)

  // Accept +639XXXXXXXXX, 639XXXXXXXXX, 09XXXXXXXXX
  let normalized = digits

  if (startsWithPlus && digits.startsWith('63') && digits.length === 12) {
    normalized = `0${digits.slice(2)}`
  } else if (!startsWithPlus && digits.startsWith('63') && digits.length === 12) {
    normalized = `0${digits.slice(2)}`
  }

  const isValid = /^09\d{9}$/.test(normalized)
  return isValid ? normalized : null
}

export const maskPhilippinePhone = (value: string): string => {
  const digits = extractDigits(value).slice(0, PH_PHONE_DIGITS)

  if (digits.length <= 4) return digits
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
}

export const isValidPhilippinePhone = (value: string): boolean => {
  return normalizePhilippinePhone(value) !== null
}

export const getPhilippinePhoneValidationMessage = (value: string): string => {
  if (!value.trim()) return 'Phone number is required.'

  const normalized = normalizePhilippinePhone(value)
  if (normalized) return ''

  return 'Please enter a valid Philippine mobile number (e.g., 0912 345 6789).'
}

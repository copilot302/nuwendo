import { BASE_URL } from '@/config/api'

export const addressService = {
  async getRegions() {
    const response = await fetch(`${BASE_URL}/api/addresses/regions`)
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
    return data.regions
  },

  async getProvinces(regionCode: string) {
    if (!regionCode) return []
    const response = await fetch(`${BASE_URL}/api/addresses/provinces/${encodeURIComponent(regionCode)}`)
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
    return data.provinces
  },

  async getCities(provinceCode: string) {
    if (!provinceCode) return []
    const response = await fetch(`${BASE_URL}/api/addresses/cities/${encodeURIComponent(provinceCode)}`)
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
    return data.cities
  },

  async getBarangays(cityCode: string) {
    if (!cityCode) return []
    const response = await fetch(`${BASE_URL}/api/addresses/barangays/${encodeURIComponent(cityCode)}`)
    const data = await response.json()
    if (!data.success) throw new Error(data.message)
    return data.barangays
  }
}

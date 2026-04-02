// API Configuration
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const defaultApiUrl = isLocalhost ? 'http://localhost:5000' : 'https://api.nuwendo.com';
const defaultAppUrl = isLocalhost ? 'http://localhost:5173' : 'https://app.nuwendo.com';

export const API_URL = import.meta.env.VITE_API_URL || defaultApiUrl;
export const APP_URL = import.meta.env.VITE_APP_URL || defaultAppUrl;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: `${API_URL}/api/auth`,
  ADMIN_AUTH: `${API_URL}/api/admin/auth`,
  
  // Patient
  PATIENT: `${API_URL}/api/patient`,
  
  // Booking
  BOOKING: `${API_URL}/api/booking`,
  AVAILABILITY: `${API_URL}/api/availability`,
  
  // Services
  SERVICES: `${API_URL}/api/services`,
  
  // Shop
  SHOP: `${API_URL}/api/shop`,
  ADMIN_SHOP: `${API_URL}/api/admin/shop`,
  
  // Admin
  ADMIN: `${API_URL}/api/admin`,
  ADMIN_BOOKINGS: `${API_URL}/api/admin/bookings`,
  ADMIN_SERVICES: `${API_URL}/api/admin/services`,
  ADMIN_USERS: `${API_URL}/api/admin/users`,
  ADMIN_AUDIT: `${API_URL}/api/admin/audit-logs`,
  ADMIN_PAYMENTS: `${API_URL}/api/admin/payments`,
  ADMIN_SCHEDULE: `${API_URL}/api/admin/schedule`,
  
  // OAuth
  OAUTH_GOOGLE: `${API_URL}/api/oauth/google`,
};

export default {
  API_URL,
  APP_URL,
  API_ENDPOINTS,
};

// API Configuration
// Automatically detects environment and uses correct API URL

const getApiUrl = () => {
  // First, check if environment variable is set (production/staging)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // If we're on localhost (development), use local backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }

  // Production fallback (Hostinger deployment)
  return 'https://api.nuwendo.com';
};

export const API_URL = getApiUrl() + '/api';
export const BASE_URL = getApiUrl();

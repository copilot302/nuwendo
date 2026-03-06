import express from 'express';
import { philippineAddresses } from '../data/philippineAddresses.js';

const router = express.Router();

// Get all provinces
router.get('/provinces', (req, res) => {
  res.json({
    success: true,
    provinces: philippineAddresses.provinces
  });
});

// Get cities by province
router.get('/cities/:provinceCode', (req, res) => {
  const { provinceCode } = req.params;
  const cities = philippineAddresses.cities[provinceCode] || [];
  res.json({
    success: true,
    cities
  });
});

// Get barangays by city
router.get('/barangays/:cityCode', (req, res) => {
  const { cityCode } = req.params;
  const barangays = philippineAddresses.barangays[cityCode] || [];
  res.json({
    success: true,
    barangays: barangays.map(name => ({ name }))
  });
});

export default router;

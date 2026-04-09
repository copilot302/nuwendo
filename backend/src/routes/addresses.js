import express from 'express';
import { philippineAddresses, getProvincesByRegion, getBarangays } from '../data/philippineAddresses.js';

const router = express.Router();

// Get all regions
router.get('/regions', (req, res) => {
  res.json({
    success: true,
    regions: philippineAddresses.regions
  });
});

// Get provinces by region
router.get('/provinces', (req, res) => {
  res.json({
    success: true,
    provinces: []
  });
});

router.get('/provinces/:regionCode', (req, res) => {
  const { regionCode } = req.params;
  const provinces = getProvincesByRegion(regionCode);
  res.json({
    success: true,
    provinces
  });
});

// Get cities by province
router.get('/cities', (req, res) => {
  res.json({
    success: true,
    cities: []
  });
});

router.get('/cities/:provinceCode', (req, res) => {
  const { provinceCode } = req.params;
  const cities = philippineAddresses.cities[provinceCode] || [];
  res.json({
    success: true,
    cities
  });
});

// Get barangays by city
router.get('/barangays', (req, res) => {
  res.json({
    success: true,
    barangays: []
  });
});

router.get('/barangays/:cityCode', (req, res) => {
  const { cityCode } = req.params;
  const barangays = getBarangays(cityCode);
  res.json({
    success: true,
    barangays: barangays.map((name, index) => ({
      code: `${cityCode}_BRG_${index + 1}`,
      name
    }))
  });
});

export default router;

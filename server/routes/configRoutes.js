const express = require('express');
const router = express.Router();
const { 
  getFooterConfig, 
  updateFooterConfig,
  getFeaturesConfig,
  updateFeaturesConfig
} = require('../controllers/configController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/footer', getFooterConfig);
router.put('/footer', protect, authorize('superadmin'), updateFooterConfig);

router.get('/features', getFeaturesConfig);
router.put('/features', protect, authorize('superadmin'), updateFeaturesConfig);

module.exports = router;

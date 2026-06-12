const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  verifyOTP,
  resetPassword
} = require('../controllers/authController');
const { apiLimiter } = require('../middleware/rateLimiter');

router.post('/register', apiLimiter, registerUser);
router.post('/login', apiLimiter, loginUser);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logoutUser);
router.post('/forgot-password', apiLimiter, forgotPassword);
router.post('/verify-otp', apiLimiter, verifyOTP);
router.post('/reset-password', apiLimiter, resetPassword);

module.exports = router;

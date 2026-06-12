const express = require('express');
const router = express.Router();
const {
  getMyBookings,
  getBookingByPnr,
  checkInBooking,
  cancelBooking,
  downloadBoardingPassPDF
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getMyBookings);
router.get('/pnr/:pnr', getBookingByPnr);
router.get('/:id/boarding-pass', downloadBoardingPassPDF);
router.post('/:id/checkin', checkInBooking);
router.post('/:id/cancel', protect, cancelBooking);

module.exports = router;

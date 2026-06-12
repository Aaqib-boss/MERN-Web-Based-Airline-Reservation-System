const express = require('express');
const router = express.Router();
const { initiatePayment, confirmPayment } = require('../controllers/paymentController');

router.post('/initiate', initiatePayment);
router.post('/confirm', confirmPayment);

module.exports = router;

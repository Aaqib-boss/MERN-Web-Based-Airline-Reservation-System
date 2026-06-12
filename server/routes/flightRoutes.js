const express = require('express');
const router = express.Router();
const { searchFlights, getFlightById, getFlightStatus } = require('../controllers/flightController');

router.get('/search', searchFlights);
router.get('/status/:flightNumber', getFlightStatus);
router.get('/:id', getFlightById);

module.exports = router;

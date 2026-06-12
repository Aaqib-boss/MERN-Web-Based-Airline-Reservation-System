const Flight = require('../models/Flight');
const { rankFlights } = require('../services/aiSuggestion');
const { calculateSeatPrice } = require('../services/pricingEngine');

// @desc    Search flights with AI ranking
// @route   GET /api/flights/search
// @access  Public
const searchFlights = async (req, res, next) => {
  try {
    const { from, to, date, cabinClass = 'Economy', timeSlot, loyaltyTier = 'Bronze' } = req.query;

    if (!from || !to) {
      res.status(400);
      throw new Error('Origin (from) and Destination (to) codes are required');
    }

    const query = {
      'origin.code': from.toUpperCase(),
      'destination.code': to.toUpperCase()
    };

    // Date range filter if date is provided
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      query.departureTime = {
        $gte: startOfDay,
        $lte: endOfDay
      };
    }

    const flights = await Flight.find(query);

    // Rank flights using AI ranking engine
    const preferences = { preferredTimeSlot: timeSlot, loyaltyTier };
    const rankedFlights = rankFlights(flights, preferences, cabinClass);

    res.json(rankedFlights);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single flight details (including seat grid)
// @route   GET /api/flights/:id
// @access  Public
const getFlightById = async (req, res, next) => {
  try {
    const flight = await Flight.findById(req.params.id);
    if (!flight) {
      res.status(404);
      throw new Error('Flight not found');
    }

    const { loyaltyTier = 'Bronze' } = req.query;

    // Convert document to plain object so we can adjust seat prices
    const flightObj = flight.toObject();

    flightObj.cabinClasses.forEach(cc => {
      cc.seats.forEach(seat => {
        seat.currentPrice = calculateSeatPrice(flight, seat, cc.class, loyaltyTier);
      });
    });

    res.json(flightObj);
  } catch (error) {
    next(error);
  }
};

// @desc    Get flight status by flight number
// @route   GET /api/flights/status/:flightNumber
// @access  Public
const getFlightStatus = async (req, res, next) => {
  try {
    const flights = await Flight.find({ flightNumber: req.params.flightNumber.toUpperCase() })
      .sort({ departureTime: -1 })
      .limit(5);

    res.json(flights);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchFlights,
  getFlightById,
  getFlightStatus
};

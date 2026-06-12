const Flight = require('../models/Flight');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { generatePNR } = require('../services/pnrGenerator');
const { getIO } = require('../config/socketConfig');

// @desc    Initiate Mock Payment Transaction
// @route   POST /api/payments/initiate
// @access  Public
const initiatePayment = async (req, res, next) => {
  try {
    const { amount, currency = 'INR', flightId, seats } = req.body;

    if (!amount || !flightId || !seats || seats.length === 0) {
      res.status(400);
      throw new Error('Amount, flightId, and seats are required to initiate payment');
    }

    // Simulate 2-second gateway processing delay
    setTimeout(async () => {
      try {
        // 95% success rate, 5% failure rate simulation
        const isSuccessful = Math.random() > 0.05;
        const transactionId = `tx_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

        if (isSuccessful) {
          res.json({
            transactionId,
            status: 'success',
            amount,
            currency
          });
        } else {
          res.status(402).json({
            transactionId,
            status: 'failed',
            message: 'Transaction declined by payment gateway bank'
          });
        }
      } catch (err) {
        next(err);
      }
    }, 2000);
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm Payment and finalize booking PNR
// @route   POST /api/payments/confirm
// @access  Public
const confirmPayment = async (req, res, next) => {
  try {
    const { transactionId, flightId, cabinClass = 'Economy', seats, passengers, totalAmount, currency = 'INR', userId, method = 'card' } = req.body;

    if (!transactionId || !flightId || !seats || !passengers || passengers.length === 0) {
      res.status(400);
      throw new Error('Required transaction details are missing');
    }

    const flight = await Flight.findById(flightId);
    if (!flight) {
      res.status(404);
      throw new Error('Flight not found');
    }

    // 1. Lock seats permanently in the Flight document
    const seatsToBook = seats.map(s => s.toUpperCase());
    flight.cabinClasses.forEach(cc => {
      cc.seats.forEach(seat => {
        if (seatsToBook.includes(seat.seatNumber)) {
          seat.isAvailable = false;
          seat.lockedBy = null;
          seat.lockedUntil = null;
        }
      });
    });

    flight.availableSeats = Math.max(0, flight.availableSeats - seats.length);
    await flight.save();

    // 2. Generate PNR
    const pnr = await generatePNR();

    // 3. Create Booking Record
    const ticketPrefix = `${flight.flightNumber.replace('-', '')}`;
    const passengerData = passengers.map((p, idx) => ({
      name: p.name,
      age: p.age,
      gender: p.gender,
      passportNumber: p.passportNumber,
      seatNumber: seats[idx],
      cabinClass: cabinClass,
      ticketNumber: `${ticketPrefix}-${1000 + Math.floor(Math.random() * 9000)}`,
      mealPreference: p.mealPreference || 'standard',
      specialAssistance: p.specialAssistance || 'none'
    }));

    const booking = new Booking({
      pnr,
      userId: userId || null,
      flightIds: [flightId],
      passengers: passengerData,
      tripType: 'one-way',
      totalAmount,
      currency,
      paymentStatus: 'success',
      status: 'confirmed',
      checkinStatus: 'not-checked-in',
      boardingPassIssued: false
    });

    // 4. Create Payment Record
    const payment = new Payment({
      bookingId: booking._id,
      userId: userId || null,
      amount: totalAmount,
      currency,
      method,
      gateway: 'mock',
      gatewayTransactionId: transactionId,
      status: 'success'
    });

    await payment.save();
    booking.paymentId = payment._id;
    await booking.save();

    // 5. Update user loyalty points & tier if logged in
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        // Earn 10 loyalty points per 1 USD (or equivalent INR)
        // Let's assume 1 USD = 80 INR
        const inrAmount = currency === 'INR' ? totalAmount : (totalAmount * 80); // approximate conversion
        const pointsEarned = Math.round((inrAmount / 80) * 10);
        
        user.loyaltyPoints += pointsEarned;
        
        // Upgrade tier thresholds
        if (user.loyaltyPoints >= 30000) user.loyaltyTier = 'Platinum';
        else if (user.loyaltyPoints >= 15000) user.loyaltyTier = 'Gold';
        else if (user.loyaltyPoints >= 5000) user.loyaltyTier = 'Silver';
        
        user.travelHistory.push({
          bookingId: booking._id,
          flightId: flight.flightNumber,
          date: new Date().toISOString().split('T')[0],
          route: `${flight.origin.code}-${flight.destination.code}`
        });

        await user.save();
      }
    }

    // 6. Broadcast socket events
    const io = getIO();
    seatsToBook.forEach(seatNumber => {
      io.emit('seat:booked', { flightId, seatNumber });
    });
    io.emit('booking:confirmed', { pnr, bookingId: booking._id });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initiatePayment,
  confirmPayment
};

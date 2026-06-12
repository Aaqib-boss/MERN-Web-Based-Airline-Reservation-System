const Booking = require('../models/Booking');
const Flight = require('../models/Flight');
const Payment = require('../models/Payment');
const { getIO } = require('../config/socketConfig');

// @desc    Get all bookings for logged-in user
// @route   GET /api/bookings
// @access  Private
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('flightIds')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

// @desc    Retrieve booking by PNR (Public lookup)
// @route   GET /api/bookings/pnr/:pnr
// @access  Public
const getBookingByPnr = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ pnr: req.params.pnr.toUpperCase() })
      .populate('flightIds');

    if (!booking) {
      res.status(404);
      throw new Error('PNR booking record not found');
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

// @desc    Perform check-in
// @route   POST /api/bookings/:id/checkin
// @access  Public
const checkInBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }

    if (booking.status === 'cancelled') {
      res.status(400);
      throw new Error('Cannot check-in to a cancelled booking');
    }

    booking.checkinStatus = 'checked-in';
    booking.boardingPassIssued = true;
    await booking.save();

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel booking & process refund
// @route   POST /api/bookings/:id/cancel
// @access  Private/Public (Authenticated / owner check)
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404);
      throw new Error('Booking record not found');
    }

    if (booking.status === 'cancelled') {
      res.status(400);
      throw new Error('Booking is already cancelled');
    }

    // Load first flight to check refund policy window
    const flight = await Flight.findById(booking.flightIds[0]);
    if (!flight) {
      res.status(404);
      throw new Error('Associated flight not found');
    }

    // Calculate Refund
    let refundPercent = 0;
    const now = new Date();
    const departure = new Date(flight.departureTime);
    
    if (flight.status === 'cancelled') {
      refundPercent = 1.0; // 100% refund for cancelled flights
    } else {
      const hoursDifference = (departure - now) / (1000 * 60 * 60);
      
      if (hoursDifference > 72) {
        refundPercent = 0.90; // 90% refund if >72h
      } else if (hoursDifference >= 24 && hoursDifference <= 72) {
        refundPercent = 0.50; // 50% refund if 24-72h
      } else {
        refundPercent = 0.00; // 0% refund if <24h (non-refundable)
      }
    }

    const refundAmount = Math.round(booking.totalAmount * refundPercent);

    // 1. Release seats in the flight
    const bookedSeats = booking.passengers.map(p => p.seatNumber.toUpperCase());
    flight.cabinClasses.forEach(cc => {
      cc.seats.forEach(seat => {
        if (bookedSeats.includes(seat.seatNumber)) {
          seat.isAvailable = true; // Make available again
        }
      });
    });

    flight.availableSeats += booking.passengers.length;
    await flight.save();

    // 2. Update Booking status
    booking.status = 'cancelled';
    booking.paymentStatus = refundAmount > 0 ? 'refunded' : 'failed';
    booking.refundAmount = refundAmount;
    booking.refundStatus = refundAmount > 0 ? 'processed' : 'none';
    booking.cancellationReason = req.body.reason || 'Cancelled by passenger';
    await booking.save();

    // 3. Update Payment record
    const payment = await Payment.findById(booking.paymentId);
    if (payment) {
      payment.status = refundAmount > 0 ? 'refunded' : 'failed';
      payment.refundId = `ref_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      payment.refundAmount = refundAmount;
      payment.refundInitiatedAt = new Date();
      await payment.save();
    }

    // 4. Emit socket events to update seat grid in real time
    const io = getIO();
    bookedSeats.forEach(seatNumber => {
      io.emit('seat:unlocked', { flightId: flight._id.toString(), seatNumber });
    });

    res.json({
      message: 'Booking successfully cancelled',
      booking,
      refundAmount,
      refundPercent: refundPercent * 100
    });
  } catch (error) {
    next(error);
  }
};

const PDFDocument = require('pdfkit');
const qr = require('qrcode');

// @desc    Download PDF Boarding Passes with QR Codes
// @route   GET /api/bookings/:id/boarding-pass
// @access  Public
const downloadBoardingPassPDF = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('flightIds');
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found');
    }

    const flight = booking.flightIds[0];
    if (!flight) {
      res.status(404);
      throw new Error('Associated flight not found');
    }

    // Initialize PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    // Stream PDF to HTTP response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=boarding-pass-${booking.pnr}.pdf`);
    doc.pipe(res);

    // Format Date helper
    const formatD = (dString) => new Date(dString).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
    const formatT = (dString) => new Date(dString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    // Loop through passengers and generate a boarding pass for each on a separate page
    for (let i = 0; i < booking.passengers.length; i++) {
      const passenger = booking.passengers[i];

      if (i > 0) {
        doc.addPage();
      }

      // Border and card styling
      doc.rect(20, 20, 555, 300)
         .lineWidth(2)
         .strokeColor('#0066CC')
         .stroke();

      // Header Banner
      doc.rect(21, 21, 553, 50)
         .fillColor('#0A1628')
         .fill();

      // Header Text
      doc.fillColor('#FFFFFF')
         .fontSize(18)
         .font('Helvetica-Bold')
         .text('SKYWAVE AIRLINES', 40, 35);

      doc.fillColor('#00BFFF')
         .fontSize(10)
         .text('BOARDING PASS', 450, 38);

      // Reset text color for details
      doc.fillColor('#0A1628');

      // Passenger Row
      doc.fontSize(10).font('Helvetica').text('PASSENGER NAME', 40, 90);
      doc.fontSize(14).font('Helvetica-Bold').text(passenger.name.toUpperCase(), 40, 105);

      doc.fontSize(10).font('Helvetica').text('CLASS', 320, 90);
      doc.fontSize(14).font('Helvetica-Bold').text(passenger.cabinClass.toUpperCase(), 320, 105);

      doc.fontSize(10).font('Helvetica').text('PNR CODE', 450, 90);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#0066CC').text(booking.pnr, 450, 105);
      doc.fillColor('#0A1628'); // Reset color

      // Line spacer
      doc.moveTo(20, 135).lineTo(575, 135).lineWidth(1).strokeColor('#E2E8F0').stroke();

      // Flight Route details
      doc.fontSize(10).font('Helvetica').text('FROM (ORIGIN)', 40, 150);
      doc.fontSize(12).font('Helvetica-Bold').text(`${flight.origin.city} (${flight.origin.code})`, 40, 165);
      doc.fontSize(8).font('Helvetica').text(flight.origin.airport, 40, 180);

      doc.fontSize(10).font('Helvetica').text('TO (DESTINATION)', 180, 150);
      doc.fontSize(12).font('Helvetica-Bold').text(`${flight.destination.city} (${flight.destination.code})`, 180, 165);
      doc.fontSize(8).font('Helvetica').text(flight.destination.airport, 180, 180);

      doc.fontSize(10).font('Helvetica').text('FLIGHT NO', 320, 150);
      doc.fontSize(12).font('Helvetica-Bold').text(flight.flightNumber, 320, 165);

      doc.fontSize(10).font('Helvetica').text('SEAT', 450, 150);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#FFB800').text(passenger.seatNumber, 450, 165);
      doc.fillColor('#0A1628'); // Reset color

      // Line spacer
      doc.moveTo(20, 205).lineTo(575, 205).lineWidth(1).strokeColor('#E2E8F0').stroke();

      // Times and Gate Info
      doc.fontSize(10).font('Helvetica').text('DATE', 40, 220);
      doc.fontSize(12).font('Helvetica-Bold').text(formatD(flight.departureTime), 40, 235);

      doc.fontSize(10).font('Helvetica').text('DEP TIME', 180, 220);
      doc.fontSize(12).font('Helvetica-Bold').text(formatT(flight.departureTime), 180, 235);

      doc.fontSize(10).font('Helvetica').text('GATE', 320, 220);
      doc.fontSize(12).font('Helvetica-Bold').text(`T${flight.origin.terminal}`, 320, 235);

      // Generate QR Code image and embed it
      const qrDataUrl = await qr.toDataURL(JSON.stringify({
        pnr: booking.pnr,
        name: passenger.name,
        flight: flight.flightNumber,
        seat: passenger.seatNumber
      }));
      const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
      doc.image(qrBuffer, 440, 210, { width: 90 });

      // Barcode simulation lines at the very bottom
      doc.rect(40, 280, 360, 25)
         .fillColor('#0A1628')
         .fill();
      doc.fillColor('#FFFFFF')
         .fontSize(9)
         .font('Courier-Bold')
         .text(`*TICKET-${passenger.ticketNumber}*`, 150, 288);
      
      doc.fillColor('#0A1628'); // Reset color for potential next loops
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyBookings,
  getBookingByPnr,
  checkInBooking,
  cancelBooking,
  downloadBoardingPassPDF
};

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Flight = require('./models/Flight');
const Booking = require('./models/Booking');
const Payment = require('./models/Payment');
const ActivityLog = require('./models/ActivityLog');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/skywave');
    console.log('Connected to DB');

    const userCount = await User.countDocuments();
    const flightCount = await Flight.countDocuments();
    const bookingCount = await Booking.countDocuments();
    const paymentCount = await Payment.countDocuments();
    const logCount = await ActivityLog.countDocuments();

    console.log(`Users: ${userCount}`);
    console.log(`Flights: ${flightCount}`);
    console.log(`Bookings: ${bookingCount}`);
    console.log(`Payments: ${paymentCount}`);
    console.log(`ActivityLogs: ${logCount}`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();

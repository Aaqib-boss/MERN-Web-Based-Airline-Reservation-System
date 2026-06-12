const mongoose = require('mongoose');

const PassengerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
  passportNumber: { type: String, required: true, trim: true },
  seatNumber: { type: String, required: true, uppercase: true, trim: true },
  cabinClass: { type: String, required: true, enum: ['Economy', 'Business', 'First'] },
  ticketNumber: { type: String, required: true },
  mealPreference: { type: String, default: 'standard' },
  specialAssistance: { type: String, default: 'none' }
}, { _id: false });

const BookingSchema = new mongoose.Schema({
  pnr: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  flightIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Flight',
    required: true
  }],
  passengers: [PassengerSchema],
  tripType: {
    type: String,
    required: true,
    enum: ['one-way', 'round-trip', 'multi-city'],
    default: 'one-way'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'INR'
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  cancellationReason: {
    type: String,
    default: ''
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundStatus: {
    type: String,
    enum: ['none', 'pending', 'processed', 'failed'],
    default: 'none'
  },
  checkinStatus: {
    type: String,
    enum: ['not-checked-in', 'checked-in'],
    default: 'not-checked-in'
  },
  boardingPassIssued: {
    type: Boolean,
    required: true,
    default: false
  }
}, {
  timestamps: true
});

BookingSchema.index({ pnr: 1 });
BookingSchema.index({ userId: 1 });

module.exports = mongoose.model('Booking', BookingSchema);

const mongoose = require('mongoose');

const AirportDetailSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true, trim: true },
  city: { type: String, required: true, trim: true },
  airport: { type: String, required: true, trim: true },
  terminal: { type: String, default: '1' }
}, { _id: false });

const StopSchema = new mongoose.Schema({
  city: { type: String, required: true, trim: true },
  layoverDuration: { type: String, required: true }
}, { _id: false });

const SeatSchema = new mongoose.Schema({
  seatNumber: { type: String, required: true, uppercase: true, trim: true },
  row: { type: Number, required: true },
  type: { type: String, required: true, enum: ['window', 'aisle', 'middle'] },
  isAvailable: { type: Boolean, required: true, default: true },
  lockedBy: { type: String, default: null },
  lockedUntil: { type: Date, default: null },
  currentPrice: { type: Number, required: true }
}, { _id: false });

const CabinClassSchema = new mongoose.Schema({
  class: { type: String, required: true, enum: ['Economy', 'Business', 'First'] },
  basePrice: { type: Number, required: true },
  seats: [SeatSchema]
}, { _id: false });

const FlightSchema = new mongoose.Schema({
  flightNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  airline: {
    type: String,
    required: true,
    default: 'SkyWave'
  },
  aircraft: {
    type: String,
    required: true
  },
  origin: {
    type: AirportDetailSchema,
    required: true
  },
  destination: {
    type: AirportDetailSchema,
    required: true
  },
  departureTime: {
    type: Date,
    required: true
  },
  arrivalTime: {
    type: Date,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  stops: [StopSchema],
  totalSeats: {
    type: Number,
    required: true
  },
  availableSeats: {
    type: Number,
    required: true
  },
  cabinClasses: [CabinClassSchema],
  status: {
    type: String,
    required: true,
    enum: ['scheduled', 'boarding', 'departed', 'arrived', 'delayed', 'cancelled'],
    default: 'scheduled'
  },
  baggageAllowance: {
    cabin: { type: String, default: '7kg' },
    checkin: { type: String, default: '15kg' }
  },
  amenities: [String],
  demandScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 50
  }
}, {
  timestamps: true
});

FlightSchema.index({ 'origin.code': 1, 'destination.code': 1, departureTime: 1 });

module.exports = mongoose.model('Flight', FlightSchema);

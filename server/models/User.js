const mongoose = require('mongoose');

const SavedPaymentMethodSchema = new mongoose.Schema({
  cardLast4: { type: String, required: true },
  cardBrand: { type: String, required: true },
  token: { type: String, required: true }
}, { _id: false });

const TravelHistorySchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  flightId: { type: String, required: true },
  date: { type: String, required: true },
  route: { type: String, required: true }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  loyaltyTier: {
    type: String,
    required: true,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    default: 'Bronze'
  },
  loyaltyPoints: {
    type: Number,
    required: true,
    default: 0
  },
  passportNumber: {
    type: String,
    default: ''
  },
  nationality: {
    type: String,
    default: ''
  },
  dateOfBirth: {
    type: String,
    default: ''
  },
  savedPaymentMethods: [SavedPaymentMethodSchema],
  travelHistory: [TravelHistorySchema],
  preferences: {
    seatType: { type: String, enum: ['window', 'aisle', 'middle', 'any'], default: 'any' },
    mealType: { type: String, enum: ['standard', 'vegetarian', 'non-vegetarian', 'vegan', 'halal', 'kosher'], default: 'standard' },
    notifications: { type: Boolean, default: true }
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'suspended', 'blocked'],
    default: 'active'
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  resetPasswordOTP: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  profilePicture: {
    type: String,
    default: ''
  },
  employeeId: {
    type: String,
    default: ''
  },
  memberId: {
    type: String,
    default: ''
  },
  membershipNumber: {
    type: String,
    default: ''
  },
  permissions: [{
    type: String
  }],
  activeSessions: [{
    token: { type: String },
    ip: { type: String },
    device: { type: String },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

UserSchema.index({ loyaltyTier: 1 });

module.exports = mongoose.model('User', UserSchema);

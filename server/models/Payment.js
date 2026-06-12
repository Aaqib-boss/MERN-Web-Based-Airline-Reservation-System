const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'INR'
  },
  method: {
    type: String,
    required: true,
    enum: ['card', 'upi', 'netbanking', 'wallet'],
    default: 'card'
  },
  gateway: {
    type: String,
    required: true,
    enum: ['mock', 'stripe', 'razorpay'],
    default: 'mock'
  },
  gatewayTransactionId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'success', 'failed', 'refunded'],
    default: 'pending'
  },
  refundId: {
    type: String,
    default: ''
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundInitiatedAt: {
    type: Date,
    default: null
  },
  metadata: {
    type: Map,
    of: String,
    default: {}
  }
}, {
  timestamps: true
});

PaymentSchema.index({ bookingId: 1 });
PaymentSchema.index({ userId: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);

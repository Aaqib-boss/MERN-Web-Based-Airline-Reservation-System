import React, { useState } from 'react';
import { useBooking } from '../../hooks/useBooking';
import { useAuth } from '../../hooks/useAuth';
import './BookingFlow.css';

export default function PaymentPanel() {
  const { 
    selectedFlight, 
    cabinClass, 
    selectedSeats, 
    passengers, 
    setBookingConfirmation, 
    setStep 
  } = useBooking();
  
  const { user, token, syncProfile } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState('card'); // card, upi, netbanking, wallet
  
  // Card input states
  const [cardHolder, setCardHolder] = useState(user?.name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  // UPI input
  const [upiId, setUpiId] = useState('');

  // Payment status states
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, success, failed
  const [errorMessage, setErrorMessage] = useState('');

  // Find cabin class config
  const cabinConfig = selectedFlight.cabinClasses.find(c => c.class === cabinClass) || selectedFlight.cabinClasses[2];
  
  // Calculate total price based on seat premiums
  const totalAmount = selectedSeats.reduce((sum, seatNo) => {
    const seatObj = cabinConfig.seats.find(s => s.seatNumber === seatNo);
    return sum + (seatObj ? seatObj.currentPrice : (cabinConfig.basePrice || 10000));
  }, 0);

  const handleCardNumberChange = (e) => {
    // Format card number: xxxx xxxx xxxx xxxx
    const val = e.target.value.replace(/\s?/g, '').replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < val.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += val[i];
    }
    setCardNumber(formatted.substring(0, 19));
  };

  const handleExpiryChange = (e) => {
    // Format expiry: MM/YY
    const val = e.target.value.replace(/\D/g, '');
    let formatted = val;
    if (val.length >= 2) {
      formatted = val.substring(0, 2) + '/' + val.substring(2, 4);
    }
    setExpiry(formatted.substring(0, 5));
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setPaymentStatus('processing');

    try {
      // 1. Call initiate payment on server
      const initiateRes = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          currency: 'INR',
          flightId: selectedFlight._id,
          seats: selectedSeats
        })
      });

      if (!initiateRes.ok) {
        const err = await initiateRes.json();
        throw new Error(err.message || 'Payment initiation failed.');
      }

      const initiateData = await initiateRes.json();
      
      // 2. Call confirm booking endpoint
      const confirmRes = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          transactionId: initiateData.transactionId,
          flightId: selectedFlight._id,
          cabinClass,
          seats: selectedSeats,
          passengers,
          totalAmount,
          currency: 'INR',
          userId: user?.id || null,
          method: paymentMethod
        })
      });

      if (!confirmRes.ok) {
        const err = await confirmRes.json();
        throw new Error(err.message || 'Payment verification failed.');
      }

      const bookingData = await confirmRes.json();
      
      setPaymentStatus('success');
      setBookingConfirmation(bookingData);
      
      // Sync user profile points in background
      if (token) {
        syncProfile(token);
      }

      // Navigate to confirmation page
      setTimeout(() => {
        setStep('confirmation');
      }, 1500);

    } catch (err) {
      console.error(err);
      setPaymentStatus('failed');
      setErrorMessage(err.message || 'Payment processing failed. Please try again.');
    }
  };

  if (paymentStatus === 'processing') {
    return (
      <div className="booking-flow-container glass-card payment-loading-overlay animate-fade-in">
        <span className="animate-spin" style={{ fontSize: '48px' }}>🔄</span>
        <h3>Securing Payment Gateway...</h3>
        <p style={{ color: 'var(--text-secondary)' }}>
          Please do not refresh this page or click the back button. We are processing your transaction securely.
        </p>
      </div>
    );
  }

  if (paymentStatus === 'success') {
    return (
      <div className="booking-flow-container glass-card payment-loading-overlay animate-fade-in">
        <div className="payment-success-tick">✓</div>
        <h3>Payment Successful!</h3>
        <p style={{ color: 'var(--success)', fontWeight: 'bold' }}>
          Generating booking details & airline boarding passes...
        </p>
      </div>
    );
  }

  return (
    <div className="booking-flow-container animate-fade-in">
      <div style={{ margin: '24px 0 16px' }}>
        <h2>Secure Payment</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Complete transaction to issue airline tickets.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        
        {/* Left Column: Form details */}
        <div>
          {/* Method tabs */}
          <div className="payment-methods-grid">
            <div 
              className={`payment-method-card ${paymentMethod === 'card' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('card')}
            >
              <span>💳</span> Card
            </div>
            <div 
              className={`payment-method-card ${paymentMethod === 'upi' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('upi')}
            >
              <span>📱</span> UPI
            </div>
            <div 
              className={`payment-method-card ${paymentMethod === 'netbanking' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('netbanking')}
            >
              <span>🏛️</span> Bank
            </div>
            <div 
              className={`payment-method-card ${paymentMethod === 'wallet' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('wallet')}
            >
              <span>👛</span> Wallet
            </div>
          </div>

          <form onSubmit={handlePay}>
            {paymentMethod === 'card' && (
              <div className="animate-fade-in">
                {/* Visual Card Display */}
                <div className="credit-card-visual">
                  <div className="card-top">
                    <div className="card-chip"></div>
                    <span style={{ fontWeight: '800', fontStyle: 'italic', fontSize: '14px' }}>SkyWave Gold</span>
                  </div>
                  <div className="card-number-display">
                    {cardNumber || '•••• •••• •••• ••••'}
                  </div>
                  <div className="card-bottom">
                    <div>
                      <div style={{ fontSize: '8px', opacity: 0.6 }}>CARD HOLDER</div>
                      <div className="card-holder-display">{cardHolder || 'FULL NAME'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '8px', opacity: 0.6 }}>EXPIRES</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{expiry || 'MM/YY'}</div>
                    </div>
                  </div>
                </div>

                {/* Form fields */}
                <div className="form-field" style={{ marginBottom: '16px' }}>
                  <label>Cardholder Name</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="Full Name"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    required={paymentMethod === 'card'}
                  />
                </div>

                <div className="form-field" style={{ marginBottom: '16px' }}>
                  <label>Card Number</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="4000 1234 5678 9010"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    required={paymentMethod === 'card'}
                  />
                </div>

                <div className="form-grid-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-field">
                    <label>Expiry Date</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={handleExpiryChange}
                      required={paymentMethod === 'card'}
                    />
                  </div>
                  <div className="form-field">
                    <label>CVV</label>
                    <input 
                      type="password" 
                      className="glass-input" 
                      placeholder="•••"
                      maxLength="3"
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                      required={paymentMethod === 'card'}
                    />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div className="animate-fade-in" style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', width: '150px', height: '150px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* Visual QR Code Representation */}
                  <div style={{ border: '4px solid #000', width: '120px', height: '120px', display: 'flex', flexWrap: 'wrap', opacity: 0.85 }}>
                    <div style={{ width: '40px', height: '40px', background: '#000', border: '3px solid #FFF' }}></div>
                    <div style={{ width: '40px', height: '40px' }}></div>
                    <div style={{ width: '40px', height: '40px', background: '#000', border: '3px solid #FFF' }}></div>
                    <div style={{ width: '40px', height: '40px' }}></div>
                    <div style={{ width: '40px', height: '40px', background: '#000' }}></div>
                    <div style={{ width: '40px', height: '40px' }}></div>
                    <div style={{ width: '40px', height: '40px', background: '#000', border: '3px solid #FFF' }}></div>
                    <div style={{ width: '40px', height: '40px' }}></div>
                    <div style={{ width: '40px', height: '40px', background: '#000' }}></div>
                  </div>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Scan the secure QR Code using GooglePay, PhonePe, BHIM, or Paytm to initiate checkout instantly.
                </p>
                <div className="form-field" style={{ textAlign: 'left' }}>
                  <label>Or Enter Virtual Payment Address (UPI ID)</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="username@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    required={paymentMethod === 'upi'}
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'netbanking' && (
              <div className="animate-fade-in" style={{ padding: '10px 0' }}>
                <div className="form-field">
                  <label>Select Your Bank</label>
                  <select className="glass-input" style={{ cursor: 'pointer' }} required>
                    <option value="sbi">State Bank of India</option>
                    <option value="hdfc">HDFC Bank</option>
                    <option value="icici">ICICI Bank</option>
                    <option value="axis">Axis Bank</option>
                    <option value="kotak">Kotak Mahindra Bank</option>
                  </select>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                  You will be redirected to your secure netbanking credentials page to confirm authentication.
                </p>
              </div>
            )}

            {paymentMethod === 'wallet' && (
              <div className="animate-fade-in" style={{ padding: '10px 0' }}>
                <div className="form-field">
                  <label>Select Digital Wallet</label>
                  <select className="glass-input" style={{ cursor: 'pointer' }} required>
                    <option value="paytm">Paytm Wallet</option>
                    <option value="phonepe">PhonePe Wallet</option>
                    <option value="amazon">Amazon Pay Wallet</option>
                  </select>
                </div>
              </div>
            )}

            {errorMessage && (
              <div style={{ color: 'var(--error)', fontSize: '14px', marginTop: '16px', fontWeight: 'bold' }}>
                ⚠️ {errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
              <button 
                type="button" 
                className="glass-button-secondary" 
                style={{ flex: 1, padding: '12px 0' }}
                onClick={() => setStep('passengers')}
              >
                ◀ Back
              </button>
              <button 
                type="submit" 
                className="glass-button" 
                style={{ flex: 1.5, padding: '12px 0' }}
              >
                Pay ₹{totalAmount.toLocaleString('en-IN')} ➔
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Cart details summary */}
        <div>
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Fare Details</h3>
            
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '12px' }}>
              <div style={{ fontWeight: '700', fontSize: '14px' }}>{selectedFlight.airline} - {selectedFlight.flightNumber}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {selectedFlight.origin.code} ➔ {selectedFlight.destination.code}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                <span>Travelers count:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{passengers.length} Passenger{passengers.length > 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                <span>Cabin class:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{cabinClass}</span>
              </div>
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
                <span>Selected seats:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>{selectedSeats.join(', ')}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '16px', display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontWeight: '700', fontSize: '16px' }}>
              <span>Total Price:</span>
              <span style={{ color: 'var(--success)' }}>₹{totalAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

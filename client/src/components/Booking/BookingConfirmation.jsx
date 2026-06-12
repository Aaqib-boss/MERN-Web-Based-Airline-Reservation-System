import React from 'react';
import { useBooking } from '../../hooks/useBooking';
import './BookingFlow.css';

export default function BookingConfirmation() {
  const { 
    selectedFlight, 
    bookingConfirmation, 
    resetBooking, 
    setStep 
  } = useBooking();

  if (!bookingConfirmation) {
    return (
      <div className="booking-flow-container glass-card" style={{ padding: '40px', textAlign: 'center' }}>
        <span style={{ fontSize: '40px' }}>⚠️</span>
        <h3 style={{ marginTop: '16px' }}>No active booking confirmation session found</h3>
        <button className="glass-button" style={{ marginTop: '20px' }} onClick={resetBooking}>
          Go to Search
        </button>
      </div>
    );
  }

  const { pnr, passengers, totalAmount, currency, paymentId, status } = bookingConfirmation;

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleGoToDashboard = () => {
    setStep('bookings_dashboard');
  };

  return (
    <div className="booking-flow-container animate-fade-in">
      <div style={{ textHeading: 'center', textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(0, 200, 83, 0.15)', color: 'var(--success)', fontSize: '30px', marginBottom: '16px' }}>
          ✓
        </div>
        <h2 style={{ fontSize: '26px' }}>Ticket Reservation Confirmed!</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginTop: '6px' }}>
          Your tickets have been issued and seats are locked. A confirmation email has been sent.
        </p>
      </div>

      {/* Visual Ticket Receipt Card */}
      <div className="ticket-wrapper">
        <div className="ticket-header">
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>BOARDING PASS RECIPES</h3>
            <span style={{ fontSize: '12px', opacity: 0.8 }}>SkyWave Flight Confirmation</span>
          </div>
          <div>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', textAlign: 'right', marginBottom: '4px', opacity: 0.8 }}>PNR CODE</div>
            <div className="ticket-pnr-box">{pnr}</div>
          </div>
        </div>

        <div className="ticket-body">
          {/* Flight Summary */}
          <div className="ticket-flight-info">
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>FLIGHT</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--sky-accent)' }}>{selectedFlight.flightNumber}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{selectedFlight.aircraft}</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>DEPARTURE</div>
              <div style={{ fontSize: '16px', fontWeight: '700' }}>{formatTime(selectedFlight.departureTime)}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDate(selectedFlight.departureTime)}</div>
              <div style={{ fontSize: '12px', color: 'var(--sky-gold)', fontWeight: 'bold' }}>T-{selectedFlight.origin.terminal}</div>
            </div>

            <div style={{ fontSize: '20px', color: 'rgba(255,255,255,0.2)' }}>➔</div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ARRIVAL</div>
              <div style={{ fontSize: '16px', fontWeight: '700' }}>{formatTime(selectedFlight.arrivalTime)}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{formatDate(selectedFlight.arrivalTime)}</div>
              <div style={{ fontSize: '12px', color: 'var(--sky-gold)', fontWeight: 'bold' }}>T-{selectedFlight.destination.terminal}</div>
            </div>
          </div>

          {/* Route details */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '14px' }}>
            <div>
              <strong>Origin:</strong> {selectedFlight.origin.city} ({selectedFlight.origin.code})
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{selectedFlight.origin.airport}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <strong>Destination:</strong> {selectedFlight.destination.city} ({selectedFlight.destination.code})
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{selectedFlight.destination.airport}</div>
            </div>
          </div>

          {/* Passenger Listing */}
          <h4 style={{ fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Travelers & Tickets
          </h4>
          <div style={{ marginBottom: '24px' }}>
            {passengers.map((passenger, index) => (
              <div key={passenger.seatNumber} className="ticket-passenger-row">
                <div>
                  <strong>{passenger.name}</strong> 
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                    ({passenger.gender}, Age {passenger.age})
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '24px', fontFamily: 'var(--font-mono)' }}>
                  <div>SEAT: <strong style={{ color: 'var(--sky-gold)' }}>{passenger.seatNumber}</strong></div>
                  <div>TICKET: {passenger.ticketNumber}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Receipt details */}
          <h4 style={{ fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Receipt Summary
          </h4>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
              <span>Booking Status:</span>
              <span style={{ color: 'var(--success)', fontWeight: 'bold', textTransform: 'uppercase' }}>● {status}</span>
            </div>
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
              <span>Transaction ID:</span>
              <span style={{ color: 'var(--text-primary)' }}>{paymentId || 'MOCK_GW_TX_CONFIRMED'}</span>
            </div>
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between' }}>
              <span>Total Price Paid:</span>
              <span style={{ color: 'var(--success)', fontWeight: '800', fontSize: '15px' }}>
                ₹{totalAmount.toLocaleString('en-IN')} {currency}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Barcode */}
        <div className="ticket-footer-barcode">
          <div className="barcode-stripes"></div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', letterSpacing: '2px' }}>
            *{pnr}*
          </div>
        </div>
      </div>

      {/* Action CTA buttons */}
      <div style={{ display: 'flex', gap: '16px', marginTop: '30px' }}>
        <a 
          href={`/api/bookings/${bookingConfirmation._id}/boarding-pass`}
          className="glass-button-secondary" 
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          download
        >
          <span>📥</span> Download PDF
        </a>
        <button 
          type="button" 
          className="glass-button-secondary" 
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={handlePrint}
        >
          <span>🖨️</span> Print
        </button>
        <button 
          type="button" 
          className="glass-button-secondary" 
          style={{ flex: 1 }}
          onClick={handleGoToDashboard}
        >
          View in My Bookings
        </button>
        <button 
          type="button" 
          className="glass-button" 
          style={{ flex: 1.5 }}
          onClick={resetBooking}
        >
          Book Another Flight ➔
        </button>
      </div>
    </div>
  );
}

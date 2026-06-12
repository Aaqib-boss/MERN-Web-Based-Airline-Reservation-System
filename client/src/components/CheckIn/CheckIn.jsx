import React, { useState } from 'react';
import './../Dashboard/Dashboard.css';

export default function CheckIn() {
  const [pnr, setPnr] = useState('');
  const [lastName, setLastName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [booking, setBooking] = useState(null);
  const [isCheckedInNow, setIsCheckedInNow] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    setError('');
    setBooking(null);
    setIsCheckedInNow(false);

    if (!pnr || pnr.length !== 6) {
      setError('PNR must be a valid 6-character booking code.');
      return;
    }
    if (!lastName.trim()) {
      setError('Passenger name is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/pnr/${pnr}`);
      if (!res.ok) {
        throw new Error('PNR record not found. Please verify details.');
      }
      
      const data = await res.json();
      
      // Verify name in passenger list
      const matchesName = data.passengers.some(p => 
        p.name.toLowerCase().includes(lastName.toLowerCase().trim())
      );

      if (!matchesName) {
        throw new Error('Passenger name does not match PNR record.');
      }

      if (data.status === 'cancelled') {
        throw new Error('This booking has been cancelled. Cannot perform check-in.');
      }

      setBooking(data);
      if (data.checkinStatus === 'checked-in') {
        setIsCheckedInNow(true);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCheckin = async () => {
    if (!booking) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/bookings/${booking._id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const updated = await res.json();
        setBooking(updated);
        setIsCheckedInNow(true);
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Check-in failed');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Check-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const resetForm = () => {
    setPnr('');
    setLastName('');
    setBooking(null);
    setIsCheckedInNow(false);
    setError('');
  };

  const formatDateTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '60px' }}>
      <div style={{ margin: '24px 0 16px', textAlign: 'center' }}>
        <h2>Web Check-In Portal</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Check-in for your flight, select luggage drop options, and download your boarding passes instantly.
        </p>
      </div>

      {!booking ? (
        /* PNR lookup form */
        <div className="checkin-lookup-panel glass-card animate-fade-in">
          <form onSubmit={handleLookup}>
            <div className="form-field" style={{ marginBottom: '16px' }}>
              <label>Booking Reference (PNR)</label>
              <input 
                type="text" 
                className="glass-input" 
                maxLength="6"
                placeholder="6-character alphanumeric code"
                style={{ height: '44px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: '700', letterSpacing: '1px' }}
                value={pnr}
                onChange={(e) => setPnr(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="form-field" style={{ marginBottom: '20px' }}>
              <label>Traveler Name</label>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="First Name or Last Name"
                style={{ height: '44px' }}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            {error && (
              <div style={{ color: 'var(--error)', fontSize: '14px', marginBottom: '16px', fontWeight: 'bold' }}>
                ⚠️ {error}
              </div>
            )}

            <button 
              type="submit" 
              className="glass-button" 
              style={{ width: '100%', height: '44px' }}
              disabled={loading}
            >
              {loading ? 'Searching...' : 'Lookup Booking ➔'}
            </button>
          </form>
        </div>
      ) : (
        /* Boarding pass display / Confirmation step */
        <div className="animate-fade-in">
          {!isCheckedInNow ? (
            /* Confirm check-in button */
            <div className="glass-card" style={{ maxWidth: '500px', margin: '30px auto', padding: '30px', textAlign: 'center' }}>
              <span>✈️</span>
              <h3 style={{ margin: '12px 0' }}>Reservation Verified</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px', lineHeight: '1.5' }}>
                Found flight reservation <strong>{booking.flightIds[0]?.flightNumber}</strong> ({booking.flightIds[0]?.origin?.code} ➔ {booking.flightIds[0]?.destination?.code}) for passenger party size: <strong>{booking.passengers.length}</strong>.
              </p>

              {error && (
                <div style={{ color: 'var(--error)', fontSize: '14px', marginBottom: '16px', fontWeight: 'bold' }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="glass-button-secondary" style={{ flex: 1 }} onClick={resetForm}>
                  Cancel
                </button>
                <button className="glass-button" style={{ flex: 2 }} onClick={handleConfirmCheckin} disabled={loading}>
                  {loading ? 'Checking in...' : 'Confirm Web Check-In'}
                </button>
              </div>
            </div>
          ) : (
            /* Checked-in: render boarding pass visual cards */
            <div>
              <div style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--success)' }}>
                <h3>✓ Web Check-In Completed!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                  Boarding passes issued successfully. Please present them at security gates.
                </p>
              </div>

              {/* Loop and render boarding pass for each passenger */}
              {booking.passengers.map(passenger => {
                const flight = booking.flightIds[0];
                
                return (
                  <div key={passenger.seatNumber} className="boarding-pass-visual animate-fade-in">
                    <div className="boarding-pass-top">
                      <div>
                        <span style={{ fontWeight: '800', fontSize: '18px', letterSpacing: '1px' }}>SKYWAVE</span>
                        <div style={{ fontSize: '9px', opacity: 0.8 }}>BOARDING PASS</div>
                      </div>
                      <span style={{ fontSize: '20px' }}>✈️</span>
                    </div>

                    <div className="boarding-pass-body">
                      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
                        <div>
                          <span className="bp-label">PASSENGER NAME</span>
                          <div className="bp-value" style={{ fontSize: '16px' }}>{passenger.name}</div>
                        </div>
                        <div>
                          <span className="bp-label">CLASS</span>
                          <div className="bp-value" style={{ color: 'var(--sky-primary)' }}>{passenger.cabinClass}</div>
                        </div>
                      </div>

                      <div className="boarding-pass-grid">
                        <div>
                          <span className="bp-label">FROM</span>
                          <div className="bp-value">{flight?.origin?.city} ({flight?.origin?.code})</div>
                        </div>
                        <div>
                          <span className="bp-label">TO</span>
                          <div className="bp-value">{flight?.destination?.city} ({flight?.destination?.code})</div>
                        </div>
                        <div>
                          <span className="bp-label">FLIGHT</span>
                          <div className="bp-value" style={{ color: 'var(--sky-primary)' }}>{flight?.flightNumber}</div>
                        </div>
                        <div>
                          <span className="bp-label">SEAT</span>
                          <div className="bp-value" style={{ fontSize: '16px', color: 'var(--sky-gold)' }}>{passenger.seatNumber}</div>
                        </div>
                        <div>
                          <span className="bp-label">DEPARTURE TIME</span>
                          <div className="bp-value">{formatDateTime(flight?.departureTime)}</div>
                        </div>
                        <div>
                          <span className="bp-label">PNR</span>
                          <div className="bp-value" style={{ fontFamily: 'var(--font-mono)' }}>{booking.pnr}</div>
                        </div>
                      </div>

                      {/* Barcode details */}
                      <div style={{ borderTop: '1px dashed #CBD5E0', marginTop: '20px', paddingTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ 
                          width: '100%', 
                          height: '40px', 
                          backgroundImage: 'repeating-linear-gradient(90deg, #000, #000 2px, transparent 2px, transparent 5px, #000 5px, #000 7px)' 
                        }}></div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#718096', marginTop: '4px' }}>
                          Ticket ID: {passenger.ticketNumber}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '30px' }}>
                <button className="glass-button-secondary" onClick={resetForm}>
                  ◀ Search Another PNR
                </button>
                <a 
                  href={`/api/bookings/${booking._id}/boarding-pass`}
                  className="glass-button" 
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  download
                >
                  📥 Download PDF Passes
                </a>
                <button className="glass-button-secondary" onClick={handlePrint}>
                  🖨️ Print
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

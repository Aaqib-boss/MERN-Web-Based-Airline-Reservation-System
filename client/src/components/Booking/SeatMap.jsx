import React, { useState, useEffect } from 'react';
import { useBooking } from '../../hooks/useBooking';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import './SeatMap.css';

export default function SeatMap() {
  const { 
    selectedFlight, 
    cabinClass, 
    setCabinClass,
    selectedSeats, 
    setSelectedSeats, 
    searchParams,
    setStep 
  } = useBooking();
  const socket = useSocket();
  const { user } = useAuth();

  // Find target cabin class configuration from flight
  const cabinConfig = selectedFlight.cabinClasses.find(c => c.class === cabinClass) || selectedFlight.cabinClasses[2];
  
  // Local copy of seat grids to merge real-time socket locks
  const [seats, setSeats] = useState([]);
  const [flightDetail, setFlightDetail] = useState(selectedFlight);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [socketHeldSeats, setSocketHeldSeats] = useState({}); // mapping: seatNumber -> userId (held by other sockets)

  // Fetch fresh flight details with dynamic seat prices on load
  useEffect(() => {
    const fetchFreshFlight = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/flights/${selectedFlight._id}?loyaltyTier=${user?.loyaltyTier || 'Bronze'}`);
        if (res.ok) {
          const data = await res.json();
          setFlightDetail(data);
          const config = data.cabinClasses.find(c => c.class === cabinClass) || data.cabinClasses[2];
          if (config && config.seats) {
            setSeats(config.seats);
            // Merge initially locked seats from server
            const held = {};
            config.seats.forEach(s => {
              if (s.lockedBy && s.lockedUntil && new Date(s.lockedUntil) > new Date()) {
                held[s.seatNumber] = s.lockedBy;
              }
            });
            setSocketHeldSeats(held);
          }
        }
      } catch (err) {
        console.error('Error fetching fresh flight details:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (selectedFlight) {
      fetchFreshFlight();
    }
  }, [selectedFlight, cabinClass, user]);

  // Socket listener for real-time updates
  useEffect(() => {
    if (!socket || !selectedFlight) return;

    const handleSeatLocked = ({ flightId, seatNumber, userId }) => {
      if (flightId === selectedFlight._id) {
        setSocketHeldSeats(prev => ({ ...prev, [seatNumber]: userId }));
      }
    };

    const handleSeatUnlocked = ({ flightId, seatNumber }) => {
      if (flightId === selectedFlight._id) {
        setSocketHeldSeats(prev => {
          const updated = { ...prev };
          delete updated[seatNumber];
          return updated;
        });
      }
    };

    socket.on('seat:locked', handleSeatLocked);
    socket.on('seat:unlocked', handleSeatUnlocked);

    return () => {
      socket.off('seat:locked', handleSeatLocked);
      socket.off('seat:unlocked', handleSeatUnlocked);
    };
  }, [socket, selectedFlight]);

  // Clean up holds on unmount (if they haven't checked out)
  useEffect(() => {
    return () => {
      if (socket && selectedSeats.length > 0 && selectedFlight) {
        selectedSeats.forEach(seatNo => {
          socket.emit('seat:release', { 
            flightId: selectedFlight._id, 
            seatNumber: seatNo 
          });
        });
      }
    };
  }, [socket, selectedFlight, selectedSeats]);

  const handleSeatClick = (seat) => {
    setErrorMessage('');
    const seatNo = seat.seatNumber;

    // Check if prebooked or locked by others
    if (!seat.isAvailable) return;
    if (socketHeldSeats[seatNo]) return;

    const isAlreadySelected = selectedSeats.includes(seatNo);

    if (isAlreadySelected) {
      // Release hold
      if (socket) {
        socket.emit('seat:release', { 
          flightId: selectedFlight._id, 
          seatNumber: seatNo 
        }, (res) => {
          if (res && res.success) {
            setSelectedSeats(prev => prev.filter(s => s !== seatNo));
          }
        });
      } else {
        // Offline fallback
        setSelectedSeats(prev => prev.filter(s => s !== seatNo));
      }
    } else {
      // Check if they exceed travelers count
      if (selectedSeats.length >= searchParams.totalPassengers) {
        setErrorMessage(`You can only select up to ${searchParams.totalPassengers} seat${searchParams.totalPassengers > 1 ? 's' : ''} for your passenger party.`);
        return;
      }

      // Request hold
      if (socket) {
        socket.emit('seat:hold', {
          flightId: selectedFlight._id,
          seatNumber: seatNo,
          userId: user?.id || null
        }, (res) => {
          if (res && res.success) {
            setSelectedSeats(prev => [...prev, seatNo]);
          } else {
            setErrorMessage(res.message || 'Seat is currently locked by another passenger. Please select another seat.');
          }
        });
      } else {
        // Offline fallback
        setSelectedSeats(prev => [...prev, seatNo]);
      }
    }
  };

  // Group seats by row for easier grid rendering
  const getGroupedRows = () => {
    const rows = {};
    seats.forEach(seat => {
      if (!rows[seat.row]) {
        rows[seat.row] = [];
      }
      rows[seat.row].push(seat);
    });
    
    // Sort seats in row by letter A, B, C, D, E, F
    Object.keys(rows).forEach(rowNum => {
      rows[rowNum].sort((a, b) => a.seatNumber.localeCompare(b.seatNumber));
    });

    return rows;
  };

  const groupedRows = getGroupedRows();
  const sortedRowNumbers = Object.keys(groupedRows).sort((a, b) => parseInt(a) - parseInt(b));

  const totalBasePrice = selectedSeats.length * (cabinConfig?.basePrice || 0);
  
  // Calculate price of individual selected seats (includes position premiums)
  const totalSeatPrice = selectedSeats.reduce((sum, seatNo) => {
    const seatObj = seats.find(s => s.seatNumber === seatNo);
    return sum + (seatObj ? seatObj.currentPrice : (cabinConfig?.basePrice || 0));
  }, 0);

  const handleNextStep = () => {
    if (selectedSeats.length !== searchParams.totalPassengers) {
      setErrorMessage(`Please select exactly ${searchParams.totalPassengers} seat${searchParams.totalPassengers > 1 ? 's' : ''} before continuing.`);
      return;
    }
    setStep('passengers');
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto', padding: '40px' }}>
          <span className="animate-spin" style={{ fontSize: '40px', display: 'block', marginBottom: '16px' }}>🔄</span>
          <h3>Loading Seating Grid...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
            Retrieving real-time seat availability and dynamic price updates...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in">
      <div style={{ margin: '24px 0 16px' }}>
        <h2>Interactive Cabin Seat Map</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Select seats for flight <strong style={{ color: 'var(--sky-accent)' }}>{selectedFlight.flightNumber}</strong> ({selectedFlight.origin.code} ➔ {selectedFlight.destination.code}).
        </p>
      </div>

      <div className="seatmap-container">
        
        {/* Left Column: Visual Seat Map */}
        <div>
          {/* Seat Status Legend */}
          <div className="seatmap-legend glass-card">
            <div className="legend-item">
              <div className="legend-box class-First"></div>
              <span>First Class</span>
            </div>
            <div className="legend-item">
              <div className="legend-box class-Business"></div>
              <span>Business</span>
            </div>
            <div className="legend-item">
              <div className="legend-box class-Economy"></div>
              <span>Economy</span>
            </div>
            <div className="legend-item">
              <div className="legend-box selected"></div>
              <span>Your Selection</span>
            </div>
            <div className="legend-item">
              <div className="legend-box held-by-others" style={{ borderStyle: 'dashed' }}></div>
              <span>Locked by Others</span>
            </div>
            <div className="legend-item">
              <div className="legend-box prebooked" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}></div>
              <span>Unavailable</span>
            </div>
          </div>

          {/* Plane fuselage layout */}
          <div className="plane-fuselage glass-card">
            <div className="plane-nose-indicator">Front of Aircraft (Nose)</div>

            {/* Seat Column Header */}
            <div className="seat-grid-header">
              <span>A</span>
              <span>B</span>
              <span>C</span>
              <span style={{ fontSize: '9px', textTransform: 'uppercase' }}>Aisle</span>
              <span>D</span>
              <span>E</span>
              <span>F</span>
            </div>

            {/* Render Rows */}
            <div className="scrollbar-custom" style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '6px' }}>
              {sortedRowNumbers.map(rowNum => {
                const rowSeats = groupedRows[rowNum];
                
                return (
                  <div key={rowNum} className="seat-row-grid">
                    {/* Left 3 seats (A, B, C) */}
                    {rowSeats.slice(0, 3).map(seat => {
                      const isSelected = selectedSeats.includes(seat.seatNumber);
                      const isHeldByOthers = !!socketHeldSeats[seat.seatNumber];
                      const isPrebooked = !seat.isAvailable;
                      
                      let seatClass = `seat class-${cabinClass}`;
                      if (isSelected) seatClass += ' selected';
                      else if (isHeldByOthers) seatClass += ' held-by-others';
                      else if (isPrebooked) seatClass += ' prebooked';

                      return (
                        <div 
                          key={seat.seatNumber}
                          className={seatClass}
                          title={`${seat.seatNumber} (${seat.type} - ₹${seat.currentPrice})`}
                          onClick={() => handleSeatClick(seat)}
                        >
                          {seat.seatNumber}
                        </div>
                      );
                    })}

                    {/* Aisle label/spacer */}
                    <div className="aisle-spacer">
                      {rowNum}
                    </div>

                    {/* Right 3 seats (D, E, F) */}
                    {rowSeats.slice(3, 6).map(seat => {
                      const isSelected = selectedSeats.includes(seat.seatNumber);
                      const isHeldByOthers = !!socketHeldSeats[seat.seatNumber];
                      const isPrebooked = !seat.isAvailable;
                      
                      let seatClass = `seat class-${cabinClass}`;
                      if (isSelected) seatClass += ' selected';
                      else if (isHeldByOthers) seatClass += ' held-by-others';
                      else if (isPrebooked) seatClass += ' prebooked';

                      return (
                        <div 
                          key={seat.seatNumber}
                          className={seatClass}
                          title={`${seat.seatNumber} (${seat.type} - ₹${seat.currentPrice})`}
                          onClick={() => handleSeatClick(seat)}
                        >
                          {seat.seatNumber}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Checkout Details and summary */}
        <div className="seatmap-sidebar">
          
          {/* Cabin Upgrades Upsell */}
          {cabinClass === 'Economy' && selectedFlight.cabinClasses.find(c => c.class === 'Business') && (
            <div className="glass-card animate-fade-in" style={{ padding: '16px', border: '1px solid var(--sky-accent)', background: 'rgba(0,191,255,0.03)', marginBottom: '16px' }}>
              <h4 style={{ color: 'var(--sky-accent)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>🚀 Premium Upgrade Offer</h4>
              <p style={{ fontSize: '12px', marginTop: '6px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
                Upgrade to **Business Class** for extra legroom, hot gourmet meals, and priority boarding for only **₹{(selectedFlight.cabinClasses.find(c => c.class === 'Business').basePrice - selectedFlight.cabinClasses.find(c => c.class === 'Economy').basePrice).toLocaleString('en-IN')}** more per seat!
              </p>
              <button 
                type="button" 
                className="glass-button" 
                style={{ width: '100%', padding: '8px 0', fontSize: '12px', marginTop: '12px', height: 'auto' }}
                onClick={() => {
                  setSelectedSeats([]);
                  setCabinClass('Business');
                }}
              >
                Upgrade to Business Now
              </button>
            </div>
          )}

          {cabinClass === 'Economy' && selectedFlight.cabinClasses.find(c => c.class === 'First') && (
            <div className="glass-card animate-fade-in" style={{ padding: '16px', border: '1px solid var(--sky-gold)', background: 'rgba(255,184,0,0.03)', marginBottom: '16px' }}>
              <h4 style={{ color: 'var(--sky-gold)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>👑 First Class Luxury</h4>
              <p style={{ fontSize: '12px', marginTop: '6px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
                Fly in ultimate luxury with flat-bed suites and premium lounge access for only **₹{(selectedFlight.cabinClasses.find(c => c.class === 'First').basePrice - selectedFlight.cabinClasses.find(c => c.class === 'Economy').basePrice).toLocaleString('en-IN')}** more per seat!
              </p>
              <button 
                type="button" 
                className="glass-button" 
                style={{ width: '100%', padding: '8px 0', fontSize: '12px', marginTop: '12px', height: 'auto', background: 'var(--sky-gold)', color: '#0A1628' }}
                onClick={() => {
                  setSelectedSeats([]);
                  setCabinClass('First');
                }}
              >
                Upgrade to First Class
              </button>
            </div>
          )}

          {cabinClass === 'Business' && selectedFlight.cabinClasses.find(c => c.class === 'First') && (
            <div className="glass-card animate-fade-in" style={{ padding: '16px', border: '1px solid var(--sky-gold)', background: 'rgba(255,184,0,0.03)', marginBottom: '16px' }}>
              <h4 style={{ color: 'var(--sky-gold)', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>👑 First Class Upgrade</h4>
              <p style={{ fontSize: '12px', marginTop: '6px', lineHeight: '1.4', color: 'var(--text-secondary)' }}>
                Upgrade to **First Class** for flat-bed suites, direct aisle access, and privacy partitions for only **₹{(selectedFlight.cabinClasses.find(c => c.class === 'First').basePrice - selectedFlight.cabinClasses.find(c => c.class === 'Business').basePrice).toLocaleString('en-IN')}** more per seat!
              </p>
              <button 
                type="button" 
                className="glass-button" 
                style={{ width: '100%', padding: '8px 0', fontSize: '12px', marginTop: '12px', height: 'auto', background: 'var(--sky-gold)', color: '#0A1628' }}
                onClick={() => {
                  setSelectedSeats([]);
                  setCabinClass('First');
                }}
              >
                Upgrade to First Class
              </button>
            </div>
          )}

          <div className="seat-summary-card glass-card">
            <h3>Seat Selection Summary</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '20px' }}>
              Travelers party size: <strong>{searchParams.totalPassengers} Passenger{searchParams.totalPassengers > 1 ? 's' : ''}</strong>
            </p>

            <div className="seat-price-row">
              <span>Cabin Class Base:</span>
              <span>₹{(cabinConfig?.basePrice || 0).toLocaleString('en-IN')} / seat</span>
            </div>

            <div className="seat-price-row">
              <span>Selected seats count:</span>
              <span>{selectedSeats.length} / {searchParams.totalPassengers}</span>
            </div>

            <div className="seat-price-row" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span>Your Seats:</span>
              <div className="selected-seats-badges">
                {selectedSeats.length > 0 ? (
                  selectedSeats.map(seatNo => (
                    <span key={seatNo} className="selected-seat-tag">{seatNo}</span>
                  ))
                ) : (
                  <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '13px' }}>None selected</span>
                )}
              </div>
            </div>

            <div className="seat-price-row total">
              <span>Total Price:</span>
              <span style={{ color: 'var(--success)' }}>
                ₹{totalSeatPrice.toLocaleString('en-IN')}
              </span>
            </div>

            {errorMessage && (
              <div className="animate-pulse" style={{ color: 'var(--error)', fontSize: '13px', marginTop: '16px', fontWeight: 'bold' }}>
                ⚠️ {errorMessage}
              </div>
            )}

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button 
                type="button" 
                className="glass-button-secondary" 
                style={{ flex: 1, padding: '12px 0' }}
                onClick={() => setStep('results')}
              >
                ◀ Back
              </button>
              <button 
                type="button" 
                className="glass-button" 
                style={{ flex: 1.5, padding: '12px 0' }}
                onClick={handleNextStep}
                disabled={selectedSeats.length !== searchParams.totalPassengers}
              >
                Continue ➔
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

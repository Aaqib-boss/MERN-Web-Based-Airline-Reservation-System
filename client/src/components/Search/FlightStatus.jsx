import React, { useState } from 'react';
import './FlightResults.css';

export default function FlightStatus() {
  const [flightNumber, setFlightNumber] = useState('');
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleStatusSearch = async (e) => {
    e.preventDefault();
    setError('');
    setFlights([]);
    setHasSearched(false);

    if (!flightNumber.trim()) {
      setError('Please enter a flight number.');
      return;
    }

    // Basic format validation
    const formattedNum = flightNumber.trim().toUpperCase();
    
    setLoading(true);
    try {
      const res = await fetch(`/api/flights/status/${formattedNum}`);
      if (!res.ok) {
        throw new Error('Failed to retrieve flight status.');
      }
      const data = await res.json();
      setFlights(data);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error looking up flight status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'boarding': return 'var(--warning)';
      case 'delayed': return 'var(--error)';
      case 'cancelled': return 'var(--error)';
      case 'arrived': return 'var(--success)';
      case 'departed': return 'var(--sky-primary)';
      default: return 'var(--success)';
    }
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '60px' }}>
      <div style={{ margin: '24px 0 16px', textAlign: 'center' }}>
        <h2>Real-Time Flight Tracker</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Check gate assignments, delay notices, and departure times for any SkyWave or partner flight.
        </p>
      </div>

      {/* Flight status lookup form */}
      <div className="glass-card" style={{ maxWidth: '480px', margin: '0 auto 40px', padding: '24px' }}>
        <form onSubmit={handleStatusSearch} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div className="form-field" style={{ flex: 1 }}>
            <label>Flight Number</label>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="e.g. SW-101"
              style={{ height: '44px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontWeight: '700' }}
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="glass-button" 
            style={{ height: '44px', padding: '0 24px' }}
            disabled={loading}
          >
            {loading ? 'Tracking...' : 'Track ➔'}
          </button>
        </form>
        {error && (
          <div style={{ color: 'var(--error)', fontSize: '13px', marginTop: '12px', fontWeight: 'bold' }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Status results list */}
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <span className="animate-spin" style={{ fontSize: '24px' }}>🔄</span> Retrieving flight logs...
          </div>
        )}

        {hasSearched && flights.length === 0 && (
          <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <span>🔍</span> No recent or upcoming logs found for flight <strong>{flightNumber.toUpperCase()}</strong>.
          </div>
        )}

        {hasSearched && flights.length > 0 && (
          <div>
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Status Log for {flightNumber.toUpperCase()}</h3>
            {flights.map(flight => (
              <div key={flight._id} className="flight-card glass-panel animate-fade-in" style={{ marginBottom: '16px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <div>
                    <strong style={{ fontSize: '16px' }}>{flight.origin.city} ➔ {flight.destination.city}</strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {flight.airline} • {flight.aircraft}
                    </div>
                  </div>
                  <span 
                    className="status-badge" 
                    style={{ background: 'rgba(255,255,255,0.05)', color: getStatusColor(flight.status), border: `1px solid ${getStatusColor(flight.status)}` }}
                  >
                    ● {flight.status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {/* Origin */}
                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>DEPARTURE</span>
                    <div style={{ fontSize: '15px', fontWeight: '700', marginTop: '4px' }}>
                      {formatTime(flight.departureTime)} <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>({flight.origin.code})</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {formatDate(flight.departureTime)}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>
                      Terminal {flight.origin.terminal} • Gate TBA
                    </div>
                  </div>

                  {/* Destination */}
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>ARRIVAL</span>
                    <div style={{ fontSize: '15px', fontWeight: '700', marginTop: '4px' }}>
                      {formatTime(flight.arrivalTime)} <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>({flight.destination.code})</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {formatDate(flight.arrivalTime)}
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px', fontWeight: 'bold' }}>
                      Terminal {flight.destination.terminal} • Baggage Belt TBA
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import airports from '../../assets/airports.json';
import './AdminPortal.css';

const airlinesList = ["SkyWave", "Singapore Airlines", "Emirates", "British Airways", "Lufthansa", "Qantas"];
const aircraftTypes = ["Boeing 777-300ER", "Boeing 787-9 Dreamliner", "Airbus A350-900", "Airbus A380-800", "Airbus A320 Neo"];

export default function AdminFlights({ activeTab }) {
  const { token } = useAuth();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [flightNumber, setFlightNumber] = useState('');
  const [airline, setAirline] = useState('SkyWave');
  const [aircraft, setAircraft] = useState('Airbus A320 Neo');
  
  // Autocomplete From/To State
  const [originCode, setOriginCode] = useState('');
  const [destCode, setDestCode] = useState('');
  const [fromQuery, setFromQuery] = useState('');
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toQuery, setToQuery] = useState('');
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [toSuggestions, setToSuggestions] = useState([]);

  const fromRef = useRef(null);
  const toRef = useRef(null);
  const stopRef = useRef(null);

  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [duration, setDuration] = useState('2h 15m');
  const [economyPrice, setEconomyPrice] = useState(5000);
  const [businessPrice, setBusinessPrice] = useState(12000);
  const [firstPrice, setFirstPrice] = useState(25000);
  const [totalSeatsInput, setTotalSeatsInput] = useState(180);
  const [businessSeats, setBusinessSeats] = useState(24);
  const [firstSeats, setFirstSeats] = useState(12);
  const economySeats = Math.max(0, Number(totalSeatsInput || 0) - Number(businessSeats || 0) - Number(firstSeats || 0));
  const [isNonStop, setIsNonStop] = useState(true);
  const [stopCity, setStopCity] = useState('');
  const [stopQuery, setStopQuery] = useState('');
  const [showStopSuggestions, setShowStopSuggestions] = useState(false);
  const [stopSuggestions, setStopSuggestions] = useState([]);
  const [layoverDuration, setLayoverDuration] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Close autocomplete on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (fromRef.current && !fromRef.current.contains(e.target)) {
        setShowFromSuggestions(false);
      }
      if (toRef.current && !toRef.current.contains(e.target)) {
        setShowToSuggestions(false);
      }
      if (stopRef.current && !stopRef.current.contains(e.target)) {
        setShowStopSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Auto-calculate flight duration
  useEffect(() => {
    if (departureTime && arrivalTime) {
      const dep = new Date(departureTime);
      const arr = new Date(arrivalTime);
      if (!isNaN(dep.getTime()) && !isNaN(arr.getTime())) {
        const diffMs = arr - dep;
        if (diffMs > 0) {
          const diffMins = Math.floor(diffMs / 60000);
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          setDuration(`${hours}h ${mins}m`);
        } else {
          setDuration('');
        }
      } else {
        setDuration('');
      }
    } else {
      setDuration('');
    }
  }, [departureTime, arrivalTime]);

  const fetchFlights = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/flights', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFlights(data);
      } else {
        throw new Error('Failed to fetch flights');
      }
    } catch (err) {
      console.error(err);
      setError('Error loading flights inventory.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (token && activeTab === 'flights') {
      const isInitial = flights.length === 0;
      fetchFlights(!isInitial);
    }
  }, [token, activeTab]);

  const handleCancelFlight = async (id, flightNo) => {
    if (!window.confirm(`Are you sure you want to cancel Flight ${flightNo}? This will issue 100% refunds to all booked passengers.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/flights/${id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert(`Flight ${flightNo} has been cancelled successfully.`);
        fetchFlights(true);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to cancel flight.');
      }
    } catch (err) {
      console.error(err);
      alert('Error cancelling flight.');
    }
  };

  const handleUncancelFlight = async (id, flightNo) => {
    try {
      const res = await fetch(`/api/admin/flights/${id}/uncancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert(`Flight ${flightNo} has been restored to scheduled status successfully.`);
        fetchFlights(true);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to uncancel flight.');
      }
    } catch (err) {
      console.error(err);
      alert('Error uncancelling flight.');
    }
  };

  const handleStatusChange = async (id, flightNo, newStatus) => {
    try {
      const res = await fetch(`/api/admin/flights/${id}/status`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        alert(`Flight ${flightNo} status updated to ${newStatus}.`);
        fetchFlights(true);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update flight status.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating flight status.');
    }
  };

  const handleDeleteFlight = async (id, flightNo) => {
    if (!window.confirm(`Are you sure you want to completely delete Flight ${flightNo} from the database? This action is permanent.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/flights/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert(`Flight ${flightNo} deleted successfully.`);
        fetchFlights(true);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to delete flight.');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting flight.');
    }
  };

  const handleEditSeats = async (id, flightNo, currentAvail, currentTotal) => {
    const newAvailStr = window.prompt(`Enter available seats for Flight ${flightNo}:`, currentAvail);
    if (newAvailStr === null) return;
    const newTotalStr = window.prompt(`Enter total seats for Flight ${flightNo}:`, currentTotal);
    if (newTotalStr === null) return;

    const availableSeats = parseInt(newAvailStr, 10);
    const totalSeats = parseInt(newTotalStr, 10);

    if (isNaN(availableSeats) || isNaN(totalSeats)) {
      alert('Please enter valid integers for seat counts.');
      return;
    }

    try {
      const res = await fetch(`/api/admin/flights/${id}/seats`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ availableSeats, totalSeats })
      });
      if (res.ok) {
        alert(`Flight ${flightNo} seat count updated successfully.`);
        fetchFlights(true);
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update seat counts.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating seat counts.');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    if (originCode === destCode) {
      setFormError('Origin and Destination cannot be the same.');
      setIsSubmitting(false);
      return;
    }

    const calculatedEconomySeats = Number(totalSeatsInput) - Number(businessSeats) - Number(firstSeats);
    if (calculatedEconomySeats < 0) {
      setFormError('Business Class and First Class seats combined cannot exceed Total Seats.');
      setIsSubmitting(false);
      return;
    }

    const originAirport = airports.find(a => a.code === originCode);
    const destAirport = airports.find(a => a.code === destCode);

    try {
      const res = await fetch('/api/admin/flights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          flightNumber,
          airline,
          aircraft,
          origin: {
            code: originAirport.code,
            city: originAirport.city,
            airport: originAirport.airport,
            country: originAirport.country,
            terminal: "3",
            timezone: "GMT"
          },
          destination: {
            code: destAirport.code,
            city: destAirport.city,
            airport: destAirport.airport,
            country: destAirport.country,
            terminal: "2",
            timezone: "GMT"
          },
          departureTime,
          arrivalTime,
          duration,
          stops: isNonStop ? [] : [{ city: stopCity, layoverDuration }],
          economyBasePrice: Number(economyPrice),
          businessBasePrice: Number(businessPrice),
          firstBasePrice: Number(firstPrice),
          economyClassSeats: Number(economySeats),
          businessClassSeats: Number(businessSeats),
          firstClassSeats: Number(firstSeats)
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchFlights(true);
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create flight');
      }
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Error creating flight');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFlightNumber('');
    setAirline('SkyWave');
    setAircraft('Airbus A320 Neo');
    setOriginCode('');
    setDestCode('');
    setFromQuery('');
    setToQuery('');
    setFromSuggestions([]);
    setToSuggestions([]);
    setDepartureTime('');
    setArrivalTime('');
    setDuration('2h 15m');
    setEconomyPrice(5000);
    setBusinessPrice(12000);
    setFirstPrice(25000);
    setTotalSeatsInput(180);
    setBusinessSeats(24);
    setFirstSeats(12);
    setIsNonStop(true);
    setStopCity('');
    setStopQuery('');
    setStopSuggestions([]);
    setShowStopSuggestions(false);
    setLayoverDuration('');
    setFormError('');
  };

  const filteredFlights = flights.filter(f => 
      f.flightNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.airline.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.origin.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.destination.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.origin.city || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.destination.city || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px' }}>Manage Flight Inventory</h3>
          <button className="glass-button" onClick={() => setIsModalOpen(true)}>
            <span style={{ marginRight: '6px' }}>➕</span>Schedule Flight
          </button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <input 
            type="text"
            className="glass-input"
            placeholder="🔍 Search flights by number, airline, city, or airport code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ maxWidth: '400px', padding: '10px 14px', fontSize: '13px' }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <span className="animate-spin" style={{ fontSize: '24px' }}>🔄</span> Loading inventory...
          </div>
        ) : error ? (
          <div style={{ color: 'var(--error)', fontWeight: 'bold' }}>{error}</div>
        ) : (
          <div className="table-scrollbar-wrapper">
            <table className="admin-log-table">
              <thead>
                <tr>
                  <th>Flight No</th>
                  <th>Airline</th>
                  <th>Route</th>
                  <th>Departure</th>
                  <th>Arrival</th>
                  <th>Seats (Avail/Total)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFlights.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                      No matching flights found.
                    </td>
                  </tr>
                ) : (
                  filteredFlights.map(f => (
                    <tr key={f._id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '700' }}>{f.flightNumber}</td>
                      <td>{f.airline}</td>
                      <td>
                        <strong>{f.origin.code} ➔ {f.destination.code}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {f.stops && f.stops.length > 0 ? (
                            <span style={{ color: 'var(--sky-gold)' }}>Touch Flight ({f.stops[0].city})</span>
                          ) : (
                            <span style={{ color: 'var(--success)' }}>Direct</span>
                          )}
                        </div>
                      </td>
                      <td>{new Date(f.departureTime).toLocaleDateString()} {new Date(f.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                      <td>{new Date(f.arrivalTime).toLocaleDateString()} {new Date(f.arrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                      <td>{f.availableSeats} / {f.totalSeats}</td>
                      <td>
                        <span className="status-badge" style={{ 
                          color: f.status === 'cancelled' ? 'var(--error)' : f.status === 'delayed' ? 'var(--warning)' : 'var(--success)',
                          border: `1px solid ${f.status === 'cancelled' ? 'var(--error)' : f.status === 'delayed' ? 'var(--warning)' : 'var(--success)'}`,
                          background: 'rgba(255,255,255,0.03)'
                        }}>
                          {f.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {f.status === 'cancelled' ? (
                            <button 
                              className="glass-button" 
                              style={{ padding: '4px 8px', fontSize: '10.5px', background: 'var(--success)', height: '24px', lineHeight: '14px' }}
                              onClick={() => handleUncancelFlight(f._id, f.flightNumber)}
                            >
                              Uncancel
                            </button>
                          ) : (
                            <button 
                              className="glass-button" 
                              style={{ padding: '4px 8px', fontSize: '10.5px', background: '#e11d48', height: '24px', lineHeight: '14px' }}
                              onClick={() => handleCancelFlight(f._id, f.flightNumber)}
                            >
                              Cancel
                            </button>
                          )}

                          {f.status !== 'cancelled' && (
                            f.status === 'delayed' ? (
                              <button 
                                className="glass-button" 
                                style={{ padding: '4px 8px', fontSize: '10.5px', background: 'var(--sky-primary)', height: '24px', lineHeight: '14px' }}
                                onClick={() => handleStatusChange(f._id, f.flightNumber, 'scheduled')}
                              >
                                Schedule
                              </button>
                            ) : (
                              <button 
                                className="glass-button-secondary" 
                                style={{ padding: '4px 8px', fontSize: '10.5px', border: '1px solid var(--sky-gold)', color: 'var(--sky-gold)', height: '24px', lineHeight: '14px' }}
                                onClick={() => handleStatusChange(f._id, f.flightNumber, 'delayed')}
                              >
                                Delay
                              </button>
                            )
                          )}

                          <button 
                            className="glass-button-secondary" 
                            style={{ padding: '4px 8px', fontSize: '10.5px', border: '1px solid var(--sky-accent)', color: 'var(--sky-accent)', height: '24px', lineHeight: '14px' }}
                            onClick={() => handleEditSeats(f._id, f.flightNumber, f.availableSeats, f.totalSeats)}
                          >
                            <span style={{ marginRight: '4px' }}>💺</span>Seats
                          </button>

                          <button 
                            className="glass-button-secondary" 
                            style={{ padding: '4px 8px', fontSize: '10.5px', border: '1px solid rgba(255, 51, 102, 0.5)', color: '#ff3366', height: '24px', lineHeight: '14px' }}
                            onClick={() => handleDeleteFlight(f._id, f.flightNumber)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )/* close else */}

      {/* Schedule Flight Modal */}
      {isModalOpen && (
        <div className="auth-modal-overlay animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <div className="auth-modal-content glass-card animate-scale-up" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            <h3 style={{ marginBottom: '16px' }}>Schedule New Flight</h3>

            <form onSubmit={handleCreateSubmit}>
              <div className="form-grid-row">
                <div className="form-field">
                  <label>Flight Number</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="e.g. SW-120"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Airline</label>
                  <select className="glass-input" value={airline} onChange={(e) => setAirline(e.target.value)}>
                    {airlinesList.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Aircraft Model</label>
                  <select className="glass-input" value={aircraft} onChange={(e) => setAircraft(e.target.value)}>
                    {aircraftTypes.map(ac => <option key={ac} value={ac}>{ac}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-grid-row" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-field" ref={fromRef} style={{ position: 'relative' }}>
                  <label>From (Origin)</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="Search city, country or code..."
                    value={fromQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFromQuery(val);
                      setOriginCode('');
                      if (val.trim() === '') {
                        setFromSuggestions(airports.slice(0, 10));
                      } else {
                        const filtered = airports.filter(a => 
                          a.city.toLowerCase().includes(val.toLowerCase()) || 
                          a.code.toLowerCase().includes(val.toLowerCase()) ||
                          a.country.toLowerCase().includes(val.toLowerCase()) ||
                          a.airport.toLowerCase().includes(val.toLowerCase())
                        );
                        setFromSuggestions(filtered.slice(0, 10));
                      }
                      setShowFromSuggestions(true);
                    }}
                    onFocus={() => {
                      setShowFromSuggestions(true);
                      if (!fromQuery) setFromSuggestions(airports.slice(0, 10));
                    }}
                    required
                  />
                  {showFromSuggestions && fromSuggestions.length > 0 && (
                    <ul className="admin-autocomplete-dropdown">
                      {fromSuggestions.map(ap => (
                        <li key={ap.code} onClick={() => {
                          setFromQuery(`${ap.city} (${ap.code})`);
                          setOriginCode(ap.code);
                          setShowFromSuggestions(false);
                        }}>
                          <strong>{ap.city} ({ap.code})</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                            {ap.airport}, {ap.country}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="form-field" ref={toRef} style={{ position: 'relative' }}>
                  <label>To (Destination)</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="Search city, country or code..."
                    value={toQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setToQuery(val);
                      setDestCode('');
                      if (val.trim() === '') {
                        setToSuggestions(airports.slice(0, 10));
                      } else {
                        const filtered = airports.filter(a => 
                          a.city.toLowerCase().includes(val.toLowerCase()) || 
                          a.code.toLowerCase().includes(val.toLowerCase()) ||
                          a.country.toLowerCase().includes(val.toLowerCase()) ||
                          a.airport.toLowerCase().includes(val.toLowerCase())
                        );
                        setToSuggestions(filtered.slice(0, 10));
                      }
                      setShowToSuggestions(true);
                    }}
                    onFocus={() => {
                      setShowToSuggestions(true);
                      if (!toQuery) setToSuggestions(airports.slice(0, 10));
                    }}
                    required
                  />
                  {showToSuggestions && toSuggestions.length > 0 && (
                    <ul className="admin-autocomplete-dropdown">
                      {toSuggestions.map(ap => (
                        <li key={ap.code} onClick={() => {
                          setToQuery(`${ap.city} (${ap.code})`);
                          setDestCode(ap.code);
                          setShowToSuggestions(false);
                        }}>
                          <strong>{ap.city} ({ap.code})</strong>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                            {ap.airport}, {ap.country}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="form-grid-row" style={{ gridTemplateColumns: '1.2fr 1.2fr 0.8fr' }}>
                <div className="form-field">
                  <label>Departure Time</label>
                  <input 
                    type="datetime-local" 
                    className="glass-input" 
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Arrival Time</label>
                  <input 
                    type="datetime-local" 
                    className="glass-input" 
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Duration</label>
                  <input 
                    type="text" 
                    className="glass-input" 
                    placeholder="Auto-calculated"
                    value={duration}
                    readOnly
                    required
                  />
                </div>
              </div>

              <div className="form-grid-row" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-field">
                  <label>Total Seats Capacity</label>
                  <input 
                    type="number" 
                    className="glass-input" 
                    placeholder="e.g. 180"
                    value={totalSeatsInput}
                    onChange={(e) => setTotalSeatsInput(e.target.value)}
                    min="1"
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Flight Type</label>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input 
                        type="radio" 
                        name="isNonStop" 
                        checked={isNonStop} 
                        onChange={() => setIsNonStop(true)} 
                      />
                      Direct (Non-stop)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input 
                        type="radio" 
                        name="isNonStop" 
                        checked={!isNonStop} 
                        onChange={() => setIsNonStop(false)} 
                      />
                      Touch Flight (1 Stop)
                    </label>
                  </div>
                </div>
              </div>

              {!isNonStop && (
                <div className="form-grid-row animate-fade-in" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-field" ref={stopRef} style={{ position: 'relative' }}>
                    <label>Stopover City</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="Search city, country or code..."
                      value={stopQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStopQuery(val);
                        setStopCity(val); // fallback if they type directly
                        if (val.trim() === '') {
                          setStopSuggestions(airports.slice(0, 10));
                        } else {
                          const filtered = airports.filter(a => 
                            a.city.toLowerCase().includes(val.toLowerCase()) || 
                            a.code.toLowerCase().includes(val.toLowerCase()) ||
                            a.country.toLowerCase().includes(val.toLowerCase()) ||
                            a.airport.toLowerCase().includes(val.toLowerCase())
                          );
                          setStopSuggestions(filtered.slice(0, 10));
                        }
                        setShowStopSuggestions(true);
                      }}
                      onFocus={() => {
                        setShowStopSuggestions(true);
                        if (!stopQuery) setStopSuggestions(airports.slice(0, 10));
                      }}
                      required={!isNonStop}
                    />
                    {showStopSuggestions && stopSuggestions.length > 0 && (
                      <ul className="admin-autocomplete-dropdown">
                        {stopSuggestions.map(ap => (
                          <li key={ap.code} onClick={() => {
                            setStopQuery(`${ap.city} (${ap.code})`);
                            setStopCity(ap.city);
                            setShowStopSuggestions(false);
                          }}>
                            <strong>{ap.city} ({ap.code})</strong>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block' }}>
                              {ap.airport}, {ap.country}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="form-field">
                    <label>Layover Duration</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      placeholder="e.g. 1h 30m"
                      value={layoverDuration}
                      onChange={(e) => setLayoverDuration(e.target.value)}
                      required={!isNonStop}
                    />
                  </div>
                </div>
              )}

              <div className="cabin-config-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', margin: 0 }}>Cabin Class Configurations</h4>
                  <span style={{ fontSize: '12px', color: 'var(--sky-accent)', fontWeight: 'bold' }}>
                    Total Seats: {Number(economySeats || 0) + Number(businessSeats || 0) + Number(firstSeats || 0)}
                  </span>
                </div>
                <div className="cabin-config-grid">
                  
                  {/* Economy Class Card */}
                  <div className="cabin-class-card economy-class-style">
                    <div className="cabin-card-header">🎫 Economy Class</div>
                    <div className="cabin-card-body">
                      <div className="form-field" style={{ marginBottom: '0' }}>
                        <label>Base Price (₹)</label>
                        <input 
                          type="number" 
                          className="glass-input" 
                          value={economyPrice}
                          onChange={(e) => setEconomyPrice(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-field" style={{ marginBottom: '0' }}>
                        <label>Seats Count</label>
                        <input 
                          type="text" 
                          className="glass-input" 
                          value={economySeats}
                          placeholder="Auto-calculated"
                          readOnly
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Business Class Card */}
                  <div className="cabin-class-card business-class-style">
                    <div className="cabin-card-header">💼 Business Class</div>
                    <div className="cabin-card-body">
                      <div className="form-field" style={{ marginBottom: '0' }}>
                        <label>Base Price (₹)</label>
                        <input 
                          type="number" 
                          className="glass-input" 
                          value={businessPrice}
                          onChange={(e) => setBusinessPrice(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-field" style={{ marginBottom: '0' }}>
                        <label>Seats Count</label>
                        <input 
                          type="number" 
                          className="glass-input" 
                          value={businessSeats}
                          onChange={(e) => setBusinessSeats(e.target.value)}
                          min="0"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* First Class Card */}
                  <div className="cabin-class-card first-class-style">
                    <div className="cabin-card-header">👑 First Class</div>
                    <div className="cabin-card-body">
                      <div className="form-field" style={{ marginBottom: '0' }}>
                        <label>Base Price (₹)</label>
                        <input 
                          type="number" 
                          className="glass-input" 
                          value={firstPrice}
                          onChange={(e) => setFirstPrice(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-field" style={{ marginBottom: '0' }}>
                        <label>Seats Count</label>
                        <input 
                          type="number" 
                          className="glass-input" 
                          value={firstSeats}
                          onChange={(e) => setFirstSeats(e.target.value)}
                          min="0"
                          required
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {formError && (
                <div style={{ color: 'var(--error)', fontSize: '13px', marginTop: '12px', fontWeight: 'bold' }}>
                  ⚠️ {formError}
                </div>
              )}

              <button 
                type="submit" 
                className="glass-button" 
                style={{ width: '100%', height: '44px', marginTop: '20px' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Scheduling...' : 'Confirm Flight Schedule ➔'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

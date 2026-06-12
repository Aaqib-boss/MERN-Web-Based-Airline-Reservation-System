import React, { useState, useEffect, useRef } from 'react';
import { useBooking } from '../../hooks/useBooking';
import { useAuth } from '../../hooks/useAuth';
import airports from '../../assets/airports.json';
import './SearchBar.css';

export default function FlightSearch() {
  const { startNewSearch, setSearchResults, setStep } = useBooking();
  const { user } = useAuth();
  const [tripType, setTripType] = useState('one-way'); // one-way, round-trip
  
  // From Autocomplete State
  const [fromQuery, setFromQuery] = useState('');
  const [fromCode, setFromCode] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const fromRef = useRef(null);

  // To Autocomplete State
  const [toQuery, setToQuery] = useState('');
  const [toCode, setToCode] = useState('');
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const toRef = useRef(null);

  // Flight Date
  const [departureDate, setDepartureDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  
  // Cabin class
  const [cabinClass, setCabinClass] = useState('Economy');

  // Passenger state
  const [showPassengers, setShowPassengers] = useState(false);
  const [passengersCount, setPassengersCount] = useState({
    adults: 1,
    children: 0,
    infants: 0
  });
  const passengerRef = useRef(null);

  // Error state
  const [errorMsg, setErrorMsg] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Close suggestions or dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (fromRef.current && !fromRef.current.contains(e.target)) {
        setShowFromSuggestions(false);
      }
      if (toRef.current && !toRef.current.contains(e.target)) {
        setShowToSuggestions(false);
      }
      if (passengerRef.current && !passengerRef.current.contains(e.target)) {
        setShowPassengers(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter From Suggestions
  const handleFromChange = (e) => {
    const val = e.target.value;
    setFromQuery(val);
    setFromCode(''); // reset code if editing
    
    if (val.trim() === '') {
      setFromSuggestions(airports.slice(0, 10));
    } else {
      const filtered = airports.filter(a => 
        a.city.toLowerCase().includes(val.toLowerCase()) || 
        a.code.toLowerCase().includes(val.toLowerCase()) ||
        a.airport.toLowerCase().includes(val.toLowerCase()) ||
        a.country.toLowerCase().includes(val.toLowerCase())
      );
      setFromSuggestions(filtered.slice(0, 10));
    }
  };

  const selectFromAirport = (airport) => {
    setFromQuery(`${airport.city} (${airport.code})`);
    setFromCode(airport.code);
    setShowFromSuggestions(false);
    setErrorMsg('');
  };

  // Filter To Suggestions
  const handleToChange = (e) => {
    const val = e.target.value;
    setToQuery(val);
    setToCode(''); // reset code if editing
    
    if (val.trim() === '') {
      setToSuggestions(airports.slice(0, 10));
    } else {
      const filtered = airports.filter(a => 
        a.city.toLowerCase().includes(val.toLowerCase()) || 
        a.code.toLowerCase().includes(val.toLowerCase()) ||
        a.airport.toLowerCase().includes(val.toLowerCase()) ||
        a.country.toLowerCase().includes(val.toLowerCase())
      );
      setToSuggestions(filtered.slice(0, 10));
    }
  };

  const selectToAirport = (airport) => {
    setToQuery(`${airport.city} (${airport.code})`);
    setToCode(airport.code);
    setShowToSuggestions(false);
    setErrorMsg('');
  };

  // Passenger Adjustments
  const adjustPassenger = (type, amount) => {
    setPassengersCount(prev => {
      const nextVal = prev[type] + amount;
      if (type === 'adults' && nextVal < 1) return prev;
      if (nextVal < 0) return prev;
      // Total seat limit
      const total = nextVal + (type === 'adults' ? prev.children + prev.infants : prev.adults + (type === 'children' ? prev.infants : prev.children));
      if (total > 9) return prev; // max 9 tickets
      return { ...prev, [type]: nextVal };
    });
  };

  const totalPassengers = passengersCount.adults + passengersCount.children + passengersCount.infants;

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fromCode) {
      setErrorMsg('Please select a valid origin airport from the suggestions list.');
      return;
    }
    if (!toCode) {
      setErrorMsg('Please select a valid destination airport from the suggestions list.');
      return;
    }
    if (fromCode === toCode) {
      setErrorMsg('Origin and destination airports cannot be the same.');
      return;
    }
    if (!departureDate) {
      setErrorMsg('Please select a departure date.');
      return;
    }

    setIsSearching(true);

    try {
      const url = `/api/flights/search?from=${fromCode}&to=${toCode}&date=${departureDate}&cabinClass=${cabinClass}&loyaltyTier=${user?.loyaltyTier || 'Bronze'}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Search failed to retrieve flights from the server.');
      }
      const data = await res.json();
      setSearchResults(data);
      
      startNewSearch({
        from: fromCode,
        fromCity: airports.find(a => a.code === fromCode)?.city,
        to: toCode,
        toCity: airports.find(a => a.code === toCode)?.city,
        date: departureDate,
        cabinClass,
        tripType,
        passengers: passengersCount,
        totalPassengers
      });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while fetching flights.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="search-widget-wrapper">
      <div className="container">
        <div className="search-widget-panel glass-card animate-fade-in">
          {/* Trip Type Tabs */}
          <div className="search-type-tabs">
            <button 
              type="button" 
              className={`search-tab-btn ${tripType === 'one-way' ? 'active' : ''}`}
              onClick={() => setTripType('one-way')}
            >
              One-Way
            </button>
            <button 
              type="button" 
              className={`search-tab-btn ${tripType === 'round-trip' ? 'active' : ''}`}
              onClick={() => setTripType('round-trip')}
            >
              Round-Trip
            </button>
          </div>

          <form onSubmit={handleSearchSubmit}>
            <div className="search-form-grid">
              
              {/* Origin Field */}
              <div className="search-field-group" ref={fromRef}>
                <label>From</label>
                <div className="search-input-container">
                  <span className="search-input-icon">🛫</span>
                  <input
                    type="text"
                    className="search-field-input"
                    placeholder="Origin City or Airport"
                    value={fromQuery}
                    onChange={handleFromChange}
                    onFocus={() => {
                      setShowFromSuggestions(true);
                      if (!fromQuery) setFromSuggestions(airports.slice(0, 10));
                    }}
                  />
                  {showFromSuggestions && (
                    <div className="autocomplete-box scrollbar-custom">
                      {fromSuggestions.length > 0 ? (
                        fromSuggestions.map(airport => (
                          <div 
                            key={airport.code} 
                            className="autocomplete-row"
                            onClick={() => selectFromAirport(airport)}
                          >
                            <div>
                              <div className="autocomplete-city">{airport.city}</div>
                              <div className="autocomplete-airport">{airport.airport}, {airport.country}</div>
                            </div>
                            <span className="autocomplete-code">{airport.code}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          No airports found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Destination Field */}
              <div className="search-field-group" ref={toRef}>
                <label>To</label>
                <div className="search-input-container">
                  <span className="search-input-icon">🛬</span>
                  <input
                    type="text"
                    className="search-field-input"
                    placeholder="Destination City or Airport"
                    value={toQuery}
                    onChange={handleToChange}
                    onFocus={() => {
                      setShowToSuggestions(true);
                      if (!toQuery) setToSuggestions(airports.slice(0, 10));
                    }}
                  />
                  {showToSuggestions && (
                    <div className="autocomplete-box scrollbar-custom">
                      {toSuggestions.length > 0 ? (
                        toSuggestions.map(airport => (
                          <div 
                            key={airport.code} 
                            className="autocomplete-row"
                            onClick={() => selectToAirport(airport)}
                          >
                            <div>
                              <div className="autocomplete-city">{airport.city}</div>
                              <div className="autocomplete-airport">{airport.airport}, {airport.country}</div>
                            </div>
                            <span className="autocomplete-code">{airport.code}</span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          No airports found
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Departure Date */}
              <div className="search-field-group">
                <label>Depart</label>
                <div className="search-input-container">
                  <span className="search-input-icon" style={{ left: '12px' }}>📅</span>
                  <input
                    type="date"
                    className="search-field-input"
                    style={{ paddingLeft: '40px' }}
                    min={new Date().toISOString().split('T')[0]}
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Cabin Class */}
              <div className="search-field-group">
                <label>Cabin Class</label>
                <div className="search-input-container">
                  <span className="search-input-icon">👑</span>
                  <select 
                    className="search-field-input" 
                    style={{ paddingLeft: '40px', cursor: 'pointer', appearance: 'none' }}
                    value={cabinClass}
                    onChange={(e) => setCabinClass(e.target.value)}
                  >
                    <option value="Economy">Economy</option>
                    <option value="Business">Business</option>
                    <option value="First">First Class</option>
                  </select>
                </div>
              </div>

              {/* Passengers Selector */}
              <div className="search-field-group" ref={passengerRef}>
                <label>Passengers</label>
                <div className="search-input-container">
                  <span className="search-input-icon">👥</span>
                  <input
                    type="text"
                    readOnly
                    className="search-field-input passenger-trigger-input"
                    value={`${totalPassengers} Traveler${totalPassengers > 1 ? 's' : ''}`}
                    onClick={() => setShowPassengers(!showPassengers)}
                  />
                  {showPassengers && (
                    <div className="passenger-dropdown-dialog glass-card">
                      <div className="passenger-type-row">
                        <div>
                          <strong>Adults</strong>
                          <span className="passenger-label-sub">Age 12+</span>
                        </div>
                        <div className="counter-btns">
                          <button 
                            type="button" 
                            className="counter-btn" 
                            onClick={() => adjustPassenger('adults', -1)}
                          >
                            -
                          </button>
                          <span className="counter-value">{passengersCount.adults}</span>
                          <button 
                            type="button" 
                            className="counter-btn" 
                            onClick={() => adjustPassenger('adults', 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="passenger-type-row">
                        <div>
                          <strong>Children</strong>
                          <span className="passenger-label-sub">Age 2-11</span>
                        </div>
                        <div className="counter-btns">
                          <button 
                            type="button" 
                            className="counter-btn" 
                            onClick={() => adjustPassenger('children', -1)}
                          >
                            -
                          </button>
                          <span className="counter-value">{passengersCount.children}</span>
                          <button 
                            type="button" 
                            className="counter-btn" 
                            onClick={() => adjustPassenger('children', 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="passenger-type-row">
                        <div>
                          <strong>Infants</strong>
                          <span className="passenger-label-sub">Under 2</span>
                        </div>
                        <div className="counter-btns">
                          <button 
                            type="button" 
                            className="counter-btn" 
                            onClick={() => adjustPassenger('infants', -1)}
                          >
                            -
                          </button>
                          <span className="counter-value">{passengersCount.infants}</span>
                          <button 
                            type="button" 
                            className="counter-btn" 
                            onClick={() => adjustPassenger('infants', 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {errorMsg && (
              <div className="animate-pulse" style={{ color: 'var(--error)', marginTop: '16px', fontSize: '14px', fontWeight: 'bold' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button 
                type="submit" 
                className="glass-button" 
                style={{ height: '48px', padding: '0 32px', display: 'flex', alignItems: 'center', gap: '8px' }}
                disabled={isSearching}
              >
                {isSearching ? (
                  <>
                    <span className="animate-spin">🔄</span> Searching...
                  </>
                ) : (
                  <>
                    <span>🔍</span> Search Flights
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

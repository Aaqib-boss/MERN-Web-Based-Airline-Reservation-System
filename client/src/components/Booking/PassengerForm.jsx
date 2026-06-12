import React, { useState, useEffect } from 'react';
import { useBooking } from '../../hooks/useBooking';
import './BookingFlow.css';

export default function PassengerForm() {
  const { 
    selectedSeats, 
    passengers, 
    setPassengers, 
    setStep 
  } = useBooking();

  // Initialize passengers array if empty or size mismatch
  const [passData, setPassData] = useState([]);

  useEffect(() => {
    if (passengers && passengers.length === selectedSeats.length) {
      setPassData(passengers);
    } else {
      const initial = selectedSeats.map((seat, index) => ({
        name: '',
        age: '',
        gender: 'Male',
        passportNumber: '',
        nationality: 'India',
        mealPreference: 'standard',
        specialAssistance: 'none',
        seatNumber: seat
      }));
      setPassData(initial);
    }
  }, [selectedSeats, passengers]);

  const handleInputChange = (index, field, value) => {
    setPassData(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Validation
    for (let i = 0; i < passData.length; i++) {
      const p = passData[i];
      if (!p.name.trim()) {
        setErrorMsg(`Passenger ${i + 1} name is required.`);
        return;
      }
      if (!p.age || parseInt(p.age) <= 0) {
        setErrorMsg(`Passenger ${i + 1} age must be a valid positive number.`);
        return;
      }
    }

    setPassengers(passData);
    setStep('payment');
  };

  return (
    <div className="booking-flow-container animate-fade-in">
      <div style={{ margin: '24px 0 16px' }}>
        <h2>Passenger Information</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Please enter traveler details matching their official passports or identity cards.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {passData.map((passenger, index) => (
          <div key={passenger.seatNumber} className="passenger-card glass-card">
            <div className="passenger-header">
              <h3 style={{ fontSize: '16px' }}>Passenger #{index + 1}</h3>
              <div className="passenger-seat-badge">Seat {passenger.seatNumber}</div>
            </div>

            <div className="form-grid-row">
              {/* Full Name */}
              <div className="form-field">
                <label>Full Name</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  style={{ height: '44px' }}
                  placeholder="First & Last Name"
                  value={passenger.name}
                  onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                  required
                />
              </div>

              {/* Age */}
              <div className="form-field">
                <label>Age</label>
                <input 
                  type="number" 
                  className="glass-input" 
                  style={{ height: '44px' }}
                  placeholder="Age"
                  min="0"
                  max="120"
                  value={passenger.age}
                  onChange={(e) => handleInputChange(index, 'age', parseInt(e.target.value) || '')}
                  required
                />
              </div>

              {/* Gender */}
              <div className="form-field">
                <label>Gender</label>
                <select 
                  className="glass-input" 
                  style={{ height: '44px', cursor: 'pointer' }}
                  value={passenger.gender}
                  onChange={(e) => handleInputChange(index, 'gender', e.target.value)}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other / Non-binary</option>
                </select>
              </div>
            </div>

            <div className="form-grid-row">
              {/* Passport Number */}
              <div className="form-field">
                <label>Passport Number (Optional)</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  style={{ height: '44px' }}
                  placeholder="Passport ID"
                  value={passenger.passportNumber}
                  onChange={(e) => handleInputChange(index, 'passportNumber', e.target.value)}
                />
              </div>

              {/* Nationality */}
              <div className="form-field">
                <label>Nationality</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  style={{ height: '44px' }}
                  placeholder="e.g. India"
                  value={passenger.nationality}
                  onChange={(e) => handleInputChange(index, 'nationality', e.target.value)}
                />
              </div>

              {/* Meal Preference */}
              <div className="form-field">
                <label>Inflight Meal</label>
                <select 
                  className="glass-input" 
                  style={{ height: '44px', cursor: 'pointer' }}
                  value={passenger.mealPreference}
                  onChange={(e) => handleInputChange(index, 'mealPreference', e.target.value)}
                >
                  <option value="standard">Standard Meal</option>
                  <option value="vegetarian">Vegetarian (Hindu / Jain)</option>
                  <option value="vegan">Strict Vegan</option>
                  <option value="kosher">Kosher</option>
                  <option value="halal">Halal Certified</option>
                </select>
              </div>
            </div>

            <div className="form-grid-row" style={{ gridTemplateColumns: '1.5fr 1fr 1fr' }}>
              {/* Special Assistance */}
              <div className="form-field">
                <label>Special Assistance</label>
                <select 
                  className="glass-input" 
                  style={{ height: '44px', cursor: 'pointer' }}
                  value={passenger.specialAssistance}
                  onChange={(e) => handleInputChange(index, 'specialAssistance', e.target.value)}
                >
                  <option value="none">None required</option>
                  <option value="wheelchair">Wheelchair assistance</option>
                  <option value="blind-deaf">Visual / Hearing support</option>
                  <option value="minor">Unaccompanied minor</option>
                </select>
              </div>
            </div>

          </div>
        ))}

        {errorMsg && (
          <div className="animate-pulse" style={{ color: 'var(--error)', fontSize: '14px', marginTop: '16px', fontWeight: 'bold' }}>
            ⚠️ {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', marginTop: '24px' }}>
          <button 
            type="button" 
            className="glass-button-secondary" 
            style={{ flex: 1, padding: '12px 0' }}
            onClick={() => setStep('seats')}
          >
            ◀ Back to Seats
          </button>
          <button 
            type="submit" 
            className="glass-button" 
            style={{ flex: 1.5, padding: '12px 0' }}
          >
            Proceed to Payment ➔
          </button>
        </div>
      </form>
    </div>
  );
}

import React from 'react';
import './FlightResults.css';

const airlinesList = [
  "SkyWave",
  "Singapore Airlines",
  "Emirates",
  "British Airways",
  "Lufthansa",
  "Qantas"
];

export default function FilterPanel({
  filters,
  setFilters,
  maxAllowedPrice,
  minAllowedPrice
}) {
  const handleStopsChange = (stops) => {
    setFilters(prev => ({ ...prev, stops }));
  };

  const handleAirlineToggle = (airline) => {
    setFilters(prev => {
      const activeAirlines = [...prev.airlines];
      if (activeAirlines.includes(airline)) {
        return { ...prev, airlines: activeAirlines.filter(a => a !== airline) };
      } else {
        return { ...prev, airlines: [...activeAirlines, airline] };
      }
    });
  };

  const handleTimeSlotChange = (timeSlot) => {
    setFilters(prev => ({ ...prev, timeSlot }));
  };

  const handlePriceChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setFilters(prev => ({ ...prev, maxPrice: val }));
  };

  const handleSortChange = (e) => {
    setFilters(prev => ({ ...prev, sortBy: e.target.value }));
  };

  const handleClearFilters = () => {
    setFilters({
      stops: 'all',
      airlines: [],
      timeSlot: 'all',
      maxPrice: maxAllowedPrice,
      sortBy: 'aiScore'
    });
  };

  return (
    <div className="filter-panel glass-card animate-fade-in">
      <div className="filter-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '16px' }}>Filters</h3>
        <button 
          onClick={handleClearFilters} 
          style={{ background: 'none', color: 'var(--sky-accent)', fontSize: '13px', fontWeight: 'bold' }}
        >
          Reset All
        </button>
      </div>

      {/* Sort By */}
      <div className="filter-section">
        <label className="filter-title">Sort Results</label>
        <select 
          className="glass-input" 
          style={{ height: '40px', padding: '0 12px', fontSize: '14px', width: '100%', cursor: 'pointer' }}
          value={filters.sortBy}
          onChange={handleSortChange}
        >
          <option value="aiScore">✨ Recommended (AI Score)</option>
          <option value="priceLowHigh">💵 Price: Low to High</option>
          <option value="durationShortLong">⏱️ Duration: Shortest first</option>
        </select>
      </div>

      {/* Stops */}
      <div className="filter-section">
        <div className="filter-title">Stops</div>
        <div className="filter-checkbox-group">
          <label className="filter-checkbox-label">
            <input 
              type="radio" 
              name="stops" 
              checked={filters.stops === 'all'} 
              onChange={() => handleStopsChange('all')} 
            />
            Any Stops
          </label>
          <label className="filter-checkbox-label">
            <input 
              type="radio" 
              name="stops" 
              checked={filters.stops === 'direct'} 
              onChange={() => handleStopsChange('direct')} 
            />
            Non-stop (Direct)
          </label>
          <label className="filter-checkbox-label">
            <input 
              type="radio" 
              name="stops" 
              checked={filters.stops === 'one-stop'} 
              onChange={() => handleStopsChange('one-stop')} 
            />
            1 Layover
          </label>
        </div>
      </div>

      {/* Price Range */}
      <div className="filter-section">
        <div className="filter-title">
          <span>Max Price</span>
          <span style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
            ₹{filters.maxPrice ? filters.maxPrice.toLocaleString('en-IN') : maxAllowedPrice.toLocaleString('en-IN')}
          </span>
        </div>
        <input 
          type="range" 
          className="price-range-slider" 
          min={minAllowedPrice} 
          max={maxAllowedPrice} 
          step={Math.round((maxAllowedPrice - minAllowedPrice) / 20) || 500}
          value={filters.maxPrice} 
          onChange={handlePriceChange} 
        />
        <div className="price-limit-labels">
          <span>₹{minAllowedPrice.toLocaleString('en-IN')}</span>
          <span>₹{maxAllowedPrice.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Departure Time */}
      <div className="filter-section">
        <div className="filter-title">Departure Time</div>
        <div className="filter-checkbox-group">
          <label className="filter-checkbox-label">
            <input 
              type="radio" 
              name="timeSlot" 
              checked={filters.timeSlot === 'all'} 
              onChange={() => handleTimeSlotChange('all')} 
            />
            Anytime
          </label>
          <label className="filter-checkbox-label">
            <input 
              type="radio" 
              name="timeSlot" 
              checked={filters.timeSlot === 'morning'} 
              onChange={() => handleTimeSlotChange('morning')} 
            />
            Morning (06:00 - 12:00)
          </label>
          <label className="filter-checkbox-label">
            <input 
              type="radio" 
              name="timeSlot" 
              checked={filters.timeSlot === 'afternoon'} 
              onChange={() => handleTimeSlotChange('afternoon')} 
            />
            Afternoon (12:00 - 18:00)
          </label>
          <label className="filter-checkbox-label">
            <input 
              type="radio" 
              name="timeSlot" 
              checked={filters.timeSlot === 'evening'} 
              onChange={() => handleTimeSlotChange('evening')} 
            />
            Evening & Night (18:00 - 06:00)
          </label>
        </div>
      </div>

      {/* Airlines */}
      <div className="filter-section">
        <div className="filter-title">Airlines</div>
        <div className="filter-checkbox-group">
          {airlinesList.map(airline => (
            <label key={airline} className="filter-checkbox-label">
              <input 
                type="checkbox" 
                checked={filters.airlines.includes(airline)} 
                onChange={() => handleAirlineToggle(airline)} 
              />
              {airline}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

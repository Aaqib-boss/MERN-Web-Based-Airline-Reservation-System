import React, { useState, useEffect } from 'react';
import { useBooking } from '../../hooks/useBooking';
import FilterPanel from './FilterPanel';
import FlightCard from './FlightCard';
import './FlightResults.css';

export default function FlightList() {
  const { 
    searchResults, 
    searchParams, 
    cabinClass, 
    selectFlight, 
    startNewSearch,
    setSearchResults 
  } = useBooking();

  // Filter states
  const [filters, setFilters] = useState({
    stops: 'all',
    airlines: [],
    timeSlot: 'all',
    maxPrice: 100000,
    sortBy: 'aiScore'
  });

  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100000);
  const [show30DayCalendar, setShow30DayCalendar] = useState(false);

  // Initialize filter price bounds when search results update
  useEffect(() => {
    if (searchResults && searchResults.length > 0) {
      const prices = searchResults.map(f => f.displayedPrice || f.cabinClasses.find(c => c.class === cabinClass)?.basePrice || 10000);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      setMinPrice(min);
      setMaxPrice(max);
      setFilters(prev => ({
        ...prev,
        maxPrice: max
      }));
    } else {
      setMinPrice(0);
      setMaxPrice(100000);
    }
  }, [searchResults, cabinClass]);

  if (!searchParams || !searchResults) {
    return null;
  }

  // Generate 7 days surrounding the searched departure date
  const generateCalendarDays = () => {
    const targetDate = new Date(searchParams.date);
    const days = [];
    
    // Generate dates from -3 to +3 days
    for (let i = -3; i <= 3; i++) {
      const current = new Date(targetDate);
      current.setDate(targetDate.getDate() + i);
      
      // Calculate a stable mock price based on day offset and day of week
      // (e.g. Wednesday and Sunday cheap, Friday and Monday expensive)
      let priceFactor = 1.0;
      const dayOfWeek = current.getDay();
      if (dayOfWeek === 3 || dayOfWeek === 0) priceFactor = 0.85; // -15%
      else if (dayOfWeek === 5 || dayOfWeek === 1) priceFactor = 1.15; // +15%
      
      const basePrice = minPrice || 12000;
      const mockPrice = Math.round(basePrice * priceFactor);

      days.push({
        dateStr: current.toISOString().split('T')[0],
        dateObj: current,
        price: mockPrice
      });
    }
    return days;
  };

  const calendarDays = generateCalendarDays();

  // Generate full 30 days starting from today for month overview calendar grid
  const generate30CalendarDays = () => {
    const start = new Date(); // Start from today
    const days = [];
    
    for (let i = 0; i < 30; i++) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      
      let priceFactor = 1.0;
      const dayOfWeek = current.getDay();
      if (dayOfWeek === 3 || dayOfWeek === 0) priceFactor = 0.85; // Wed & Sun cheap
      else if (dayOfWeek === 5 || dayOfWeek === 1) priceFactor = 1.15; // Fri & Mon surge
      
      const basePrice = minPrice || 12000;
      const mockPrice = Math.round(basePrice * priceFactor);

      days.push({
        dateStr: current.toISOString().split('T')[0],
        dateObj: current,
        price: mockPrice
      });
    }
    return days;
  };

  // Handle calendar day click to run a new search
  const handleCalendarDayClick = async (dateStr) => {
    try {
      const url = `/api/flights/search?from=${searchParams.from}&to=${searchParams.to}&date=${dateStr}&cabinClass=${cabinClass}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch flights');
      }
      const data = await res.json();
      setSearchResults(data);

      // Update parameters in global state
      startNewSearch({
        ...searchParams,
        date: dateStr
      });
    } catch (err) {
      console.error('Error changing calendar search date:', err);
    }
  };

  // Filter & Sort Logic
  const getFilteredAndSortedFlights = () => {
    let list = [...searchResults];

    // 1. Filter by Stops
    if (filters.stops === 'direct') {
      list = list.filter(f => f.stops.length === 0);
    } else if (filters.stops === 'one-stop') {
      list = list.filter(f => f.stops.length === 1);
    }

    // 2. Filter by Airlines
    if (filters.airlines.length > 0) {
      list = list.filter(f => filters.airlines.includes(f.airline));
    }

    // 3. Filter by Time Slot
    if (filters.timeSlot !== 'all') {
      list = list.filter(f => {
        const hour = new Date(f.departureTime).getHours();
        if (filters.timeSlot === 'morning') return hour >= 6 && hour < 12;
        if (filters.timeSlot === 'afternoon') return hour >= 12 && hour < 18;
        if (filters.timeSlot === 'evening') return hour >= 18 || hour < 6;
        return true;
      });
    }

    // 4. Filter by Max Price
    list = list.filter(f => f.displayedPrice <= filters.maxPrice);

    // 5. Sort Flights
    if (filters.sortBy === 'priceLowHigh') {
      list.sort((a, b) => a.displayedPrice - b.displayedPrice);
    } else if (filters.sortBy === 'durationShortLong') {
      const parseDur = (str) => {
        const h = str.match(/(\d+)h/) ? parseInt(str.match(/(\d+)h/)[1]) : 0;
        const m = str.match(/(\d+)m/) ? parseInt(str.match(/(\d+)m/)[1]) : 0;
        return h * 60 + m;
      };
      list.sort((a, b) => parseDur(a.duration) - parseDur(b.duration));
    } else {
      // Default to AI Score (already sorted from server but keep client robust)
      list.sort((a, b) => b.aiScore - a.aiScore);
    }

    return list;
  };

  const filteredFlights = getFilteredAndSortedFlights();

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '60px' }}>
      
      {/* Flight Search Information Summary */}
      <div style={{ margin: '24px 0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '22px' }}>
            Select Flight: {searchParams.fromCity} ({searchParams.from}) ➔ {searchParams.toCity} ({searchParams.to})
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            {filteredFlights.length} flight{filteredFlights.length !== 1 ? 's' : ''} found for {new Date(searchParams.date).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
          Cabin Class: <strong style={{ color: 'var(--sky-accent)' }}>{cabinClass}</strong>
        </div>
      </div>

      {/* Horizontal 7-Day Price Calendar Slider */}
      <div className="price-calendar-wrapper glass-card">
        <div className="price-calendar-header">
          <span>📅 Fare Calendar (Cheapest around departure date)</span>
          <button 
            type="button"
            className="theme-toggle-btn"
            style={{ background: 'none', color: 'var(--sky-accent)', fontSize: '13px', fontWeight: 'bold', width: 'auto', padding: '0 8px' }}
            onClick={() => setShow30DayCalendar(true)}
          >
            📅 View 30-Day Grid
          </button>
        </div>
        <div className="price-calendar-grid">
          {calendarDays.map((day) => {
            const isActive = day.dateStr === searchParams.date;
            const formattedDate = day.dateObj.toLocaleDateString([], { day: '2-digit', month: 'short' });
            const weekday = day.dateObj.toLocaleDateString([], { weekday: 'short' });
            
            return (
              <div 
                key={day.dateStr}
                className={`price-calendar-day ${isActive ? 'active' : ''}`}
                onClick={() => handleCalendarDayClick(day.dateStr)}
              >
                <span className="cal-date">{weekday}, {formattedDate}</span>
                <span className="cal-price">₹{day.price.toLocaleString('en-IN')}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid container for filters and cards list */}
      <div className="search-results-container">
        
        {/* Left Column: Filter Panel */}
        <FilterPanel 
          filters={filters}
          setFilters={setFilters}
          minAllowedPrice={minPrice}
          maxAllowedPrice={maxPrice}
        />

        {/* Right Column: Flight Cards List */}
        <div>
          {filteredFlights.length > 0 ? (
            filteredFlights.map(flight => (
              <FlightCard 
                key={flight._id}
                flight={flight}
                cabinClass={cabinClass}
                onSelect={selectFlight}
              />
            ))
          ) : (
            <div className="empty-results-box glass-card animate-fade-in">
              <div className="empty-results-icon">✈️</div>
              <div className="empty-results-title">No flights match your filters</div>
              <div className="empty-results-desc">
                Try loosening your filters (e.g. selecting more airlines, increasing your price limit, or changing stops) to see available flights.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 30-Day Price Calendar Modal Overlay */}
      {show30DayCalendar && (
        <div className="auth-modal-overlay animate-fade-in" onClick={() => setShow30DayCalendar(false)}>
          <div className="auth-modal-content glass-card animate-scale-up" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShow30DayCalendar(false)}>×</button>
            <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>30-Day Price Calendar</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              Compare fares over the next 30 days. Click any date to load search results instantly.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '6px' }} className="scrollbar-custom">
              {generate30CalendarDays().map(day => {
                const isActive = day.dateStr === searchParams.date;
                const formattedDate = day.dateObj.toLocaleDateString([], { day: '2-digit', month: 'short' });
                const weekday = day.dateObj.toLocaleDateString([], { weekday: 'short' });
                
                return (
                  <div 
                    key={day.dateStr}
                    className={`price-calendar-day ${isActive ? 'active' : ''}`}
                    style={{ padding: '12px 6px', textAlign: 'center' }}
                    onClick={() => {
                      handleCalendarDayClick(day.dateStr);
                      setShow30DayCalendar(false);
                    }}
                  >
                    <span style={{ fontSize: '9px', opacity: 0.8, textTransform: 'uppercase' }}>{weekday}</span>
                    <strong style={{ fontSize: '13px', display: 'block', margin: '4px 0' }}>{formattedDate}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 'bold' }}>₹{day.price.toLocaleString('en-IN')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

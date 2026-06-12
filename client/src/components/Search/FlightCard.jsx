import React, { useState } from 'react';
import './FlightResults.css';

const airlineEmojis = {
  "SkyWave": "✈️",
  "Singapore Airlines": "🇸🇬",
  "Emirates": "🇦🇪",
  "British Airways": "🇬🇧",
  "Lufthansa": "🇩🇪",
  "Qantas": "🇦🇺"
};

const amenityLabels = {
  "wifi": "📶 Free Wi-Fi",
  "meal": "🍽️ Hot Meal",
  "entertainment": "🎬 Inflight Entertainment",
  "power-outlet": "🔌 Power Outlet"
};

export default function FlightCard({ flight, cabinClass, onSelect }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
  };

  // Determine dynamic badges
  const hasBestValue = flight.tags && flight.tags.includes("Best Value");
  const hasFastest = flight.tags && flight.tags.includes("Fastest");
  const hasRecommended = flight.tags && flight.tags.includes("Recommended");

  let cardModifierClass = "";
  if (hasBestValue) cardModifierClass = "best-value";
  else if (hasFastest) cardModifierClass = "fastest";
  else if (hasRecommended) cardModifierClass = "recommended";

  return (
    <div className={`flight-card glass-panel glass-panel-hover ${cardModifierClass} animate-fade-in`}>
      {/* Top Badge Row */}
      {(flight.tags && flight.tags.length > 0 || flight.aiScore) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="flight-badge-row">
            {flight.tags && flight.tags.map(tag => (
              <span 
                key={tag} 
                className={`flight-tag-badge ${
                  tag === 'Best Value' ? 'best-value' : 
                  tag === 'Fastest' ? 'fastest' : 
                  tag === 'Recommended' ? 'recommended' : 'recommended'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
          {flight.aiScore && (
            <div className="ai-score-badge">
              <span>✨</span> AI Score: <strong>{flight.aiScore}</strong>
            </div>
          )}
        </div>
      )}

      {/* Main Info Row */}
      <div className="flight-main-info">
        {/* Airline Details */}
        <div className="airline-info">
          <div className="airline-logo-circle">
            {airlineEmojis[flight.airline] || "✈️"}
          </div>
          <div>
            <div className="airline-name">{flight.airline}</div>
            <div className="flight-number-label">{flight.flightNumber}</div>
          </div>
        </div>

        {/* Timeline Row */}
        <div className="flight-timeline-row">
          <div className="time-place">
            <div className="time">{formatTime(flight.departureTime)}</div>
            <div className="code">{flight.origin.code}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDate(flight.departureTime)}</div>
          </div>

          <div className="flight-timeline-bar">
            <div className="timeline-line">
              <span className="timeline-plane">✈</span>
            </div>
            <div className="timeline-duration">{flight.duration}</div>
            <div className={`timeline-stops ${flight.stops.length === 0 ? 'non-stop' : ''}`}>
              {flight.stops.length === 0 
                ? 'Non-stop' 
                : `${flight.stops.length} stop${flight.stops.length > 1 ? 's' : ''} (${flight.stops[0].city})`
              }
            </div>
          </div>

          <div className="time-place">
            <div className="time">{formatTime(flight.arrivalTime)}</div>
            <div className="code">{flight.destination.code}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDate(flight.arrivalTime)}</div>
          </div>
        </div>

        {/* Pricing CTA */}
        <div className="flight-pricing-cta">
          <div className="flight-price-amount">
            ₹{flight.displayedPrice.toLocaleString('en-IN')}
          </div>
          <div className="flight-price-tax-label">
            includes taxes & fees
          </div>
          <button 
            type="button" 
            className="glass-button" 
            style={{ width: '130px', padding: '8px 16px', fontSize: '14px' }}
            onClick={() => onSelect(flight)}
          >
            Select ➔
          </button>
        </div>
      </div>

      {/* Expand / Collapse Footer */}
      <div className="flight-card-footer">
        <div className="flight-amenities-list">
          {flight.amenities && flight.amenities.slice(0, 3).map(amenity => (
            <span key={amenity} style={{ fontSize: '12px' }}>
              {amenity === 'wifi' ? '📶 Wi-Fi' : 
               amenity === 'meal' ? '🍽️ Meal' : 
               amenity === 'entertainment' ? '🎬 Entertainment' : '🔌 Power'}
            </span>
          ))}
          {flight.amenities && flight.amenities.length > 3 && (
            <span>+{flight.amenities.length - 3} more</span>
          )}
        </div>
        <div 
          className="view-details-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Hide Details ▲' : 'View Flight Details ▼'}
        </div>
      </div>

      {/* Expanded Flight Details panel */}
      {isExpanded && (
        <div className="flight-details-expanded animate-slide-down">
          {/* Tech Details */}
          <div className="details-column">
            <h4>Flight details</h4>
            <ul>
              <li>Aircraft model: <span>{flight.aircraft}</span></li>
              <li>Origin terminal: <span>Terminal {flight.origin.terminal} ({flight.origin.airport})</span></li>
              <li>Destination terminal: <span>Terminal {flight.destination.terminal} ({flight.destination.airport})</span></li>
              <li>Cabin class selected: <span>{cabinClass}</span></li>
            </ul>
          </div>

          {/* Baggage & Services */}
          <div className="details-column">
            <h4>Baggage & Services</h4>
            <ul>
              <li>Cabin baggage: <span>{flight.baggageAllowance?.cabin || "7 kg"} / passenger</span></li>
              <li>Checked baggage: <span>{flight.baggageAllowance?.checkin || "15 kg"} / passenger</span></li>
              <li>Amenities: 
                <span style={{ display: 'block', textAlign: 'right', fontWeight: 'normal' }}>
                  {flight.amenities && flight.amenities.map(a => amenityLabels[a]).join(', ')}
                </span>
              </li>
              <li>Status: 
                <span style={{ 
                  color: flight.status === 'boarding' ? 'var(--warning)' : 
                         flight.status === 'delayed' ? 'var(--error)' : 'var(--success)',
                  textTransform: 'capitalize'
                }}>
                  ● {flight.status}
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

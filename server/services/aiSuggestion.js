const { getDynamicBasePrice } = require('./pricingEngine');

// Parse duration string like "2h 30m" into total minutes
const parseDurationToMinutes = (durStr) => {
  if (!durStr) return 0;
  const hoursMatch = durStr.match(/(\d+)h/);
  const minsMatch = durStr.match(/(\d+)m/);
  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
  const mins = minsMatch ? parseInt(minsMatch[1]) : 0;
  return (hours * 60) + mins;
};

// Map airline name to a mock rating (1.0 to 10.0)
const getAirlineRating = (airlineName) => {
  const ratings = {
    'SkyWave': 9.2,
    'Singapore Airlines': 9.7,
    'Emirates': 9.5,
    'British Airways': 8.6,
    'Lufthansa': 8.8,
    'Qantas': 8.9
  };
  return ratings[airlineName] || 8.0;
};

// Check if flight departure hour matches preferred time slots
const matchesPreferredTime = (departureTime, preferredSlot) => {
  if (!preferredSlot) return 50; // Neutral score
  const hour = new Date(departureTime).getHours();
  
  let slot = 'night';
  if (hour >= 6 && hour < 12) slot = 'morning';
  else if (hour >= 12 && hour < 17) slot = 'afternoon';
  else if (hour >= 17 && hour < 21) slot = 'evening';
  
  return slot === preferredSlot.toLowerCase() ? 100 : 20;
};

// Normalize values helper
const normalize = (value, min, max) => {
  if (max === min) return 100;
  return ((value - min) / (max - min)) * 100;
};

/**
 * Ranks flights dynamically based on price, duration, stops, user preferences
 * @param {Array} flights - Raw flight records
 * @param {Object} userPreferences - { preferredTimeSlot: 'morning'/'afternoon'/'evening'/'night', loyaltyTier: 'Bronze'/'Silver'/'Gold'/'Platinum' }
 * @param {String} cabinClass - 'Economy', 'Business', 'First'
 */
function rankFlights(flights, userPreferences = {}, cabinClass = 'Economy') {
  if (!flights || flights.length === 0) return [];

  // 1. Calculate price and duration in minutes for all flights to establish bounds
  const flightsWithMetadata = flights.map(flight => {
    // Determine class price dynamically using the pricing engine
    const price = getDynamicBasePrice(flight, cabinClass, userPreferences.loyaltyTier || 'Bronze');
    const durationMin = parseDurationToMinutes(flight.duration);
    
    return {
      flight,
      price,
      durationMin
    };
  });

  const prices = flightsWithMetadata.map(f => f.price);
  const durations = flightsWithMetadata.map(f => f.durationMin);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDur = Math.min(...durations);
  const maxDur = Math.max(...durations);

  // Find the fastest and cheapest flights to apply specific tags
  const cheapestPrice = minPrice;
  const fastestDuration = minDur;

  // 2. Rank each flight
  const ranked = flightsWithMetadata.map(({ flight, price, durationMin }) => {
    // Normalization scores: lower price/duration = higher score
    const priceScore = 100 - normalize(price, minPrice, maxPrice);
    const durationScore = 100 - normalize(durationMin, minDur, maxDur);
    
    const stopsScore = flight.stops.length === 0 ? 100 :
                       flight.stops.length === 1 ? 60 : 20;

    const timeScore = matchesPreferredTime(flight.departureTime, userPreferences.preferredTimeSlot);
    const rating = getAirlineRating(flight.airline);
    const airlineScore = rating * 10;

    // Weighted composite score
    const score = Math.round(
      (priceScore    * 0.35) + // Price (35%)
      (durationScore * 0.25) + // Duration (25%)
      (stopsScore    * 0.20) + // Stops (20%)
      (timeScore     * 0.10) + // Time slot (10%)
      (airlineScore  * 0.10)   // Rating (10%)
    );

    // Generate AI Tags
    const tags = [];
    if (price === cheapestPrice) tags.push("Best Value");
    if (durationMin === fastestDuration) tags.push("Fastest");
    if (flight.stops.length === 0 && !tags.includes("Fastest")) tags.push("Direct Flight");
    if (score >= 75 && !tags.includes("Best Value") && !tags.includes("Fastest")) {
      tags.push("Recommended");
    }

    // Convert flight Mongoose document to plain object
    const flightObj = flight.toObject ? flight.toObject() : { ...flight };

    return {
      ...flightObj,
      displayedPrice: price,
      aiScore: score,
      tags
    };
  });

  // Sort descending by aiScore
  return ranked.sort((a, b) => b.aiScore - a.aiScore);
}

module.exports = { rankFlights };

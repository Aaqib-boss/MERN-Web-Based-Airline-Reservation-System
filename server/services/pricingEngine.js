/**
 * Dynamic Pricing Engine for SkyWave Airlines
 */

/**
 * Calculates the dynamically adjusted price of a specific seat
 * @param {Object} flight - Flight database document
 * @param {Object} seat - Seat object inside cabin class
 * @param {String} cabinClass - 'First', 'Business', 'Economy'
 * @param {String} loyaltyTier - 'Bronze', 'Silver', 'Gold', 'Platinum'
 * @returns {Number} - Dynamically calculated price
 */
function calculateSeatPrice(flight, seat, cabinClass, loyaltyTier = 'Bronze') {
  const cabinConfig = flight.cabinClasses.find(c => c.class === cabinClass) || flight.cabinClasses[2];
  let price = cabinConfig.basePrice;

  // 1. Seat Position Premium
  if (seat.type === 'window') {
    price = Math.round(price * 1.20); // +20% window
  } else if (seat.type === 'aisle') {
    price = Math.round(price * 1.10); // +10% aisle
  }

  // 2. Occupancy Rate Surge
  const totalSeats = flight.totalSeats || 180;
  const occupiedSeats = totalSeats - (flight.availableSeats || 0);
  const occupancyRate = occupiedSeats / totalSeats;

  let occupancyFactor = 1.0;
  if (occupancyRate > 0.85) occupancyFactor = 1.40;      // +40%
  else if (occupancyRate > 0.70) occupancyFactor = 1.25; // +25%
  else if (occupancyRate > 0.50) occupancyFactor = 1.10; // +10%
  else if (occupancyRate < 0.20) occupancyFactor = 0.85; // -15%
  price = Math.round(price * occupancyFactor);

  // 3. Time to Departure Surge
  const now = new Date();
  const departure = new Date(flight.departureTime);
  const diffTime = departure - now;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  let departureFactor = 1.0;
  if (diffDays < 1) departureFactor = 1.50;      // <1 day: +50%
  else if (diffDays < 3) departureFactor = 1.30; // <3 days: +30%
  else if (diffDays < 7) departureFactor = 1.15; // <7 days: +15%
  else if (diffDays < 14) departureFactor = 1.05;// <14 days: +5%
  else if (diffDays > 60) departureFactor = 0.80;// >60 days: -20%
  price = Math.round(price * departureFactor);

  // 4. Time of Day Surge
  const departureHour = departure.getHours();
  let timeOfDayFactor = 1.0;
  if (departureHour >= 7 && departureHour < 10) timeOfDayFactor = 1.20; // Morning rush: +20%
  else if (departureHour >= 17 && departureHour < 20) timeOfDayFactor = 1.20; // Evening rush: +20%
  else if (departureHour >= 1 && departureHour < 5) timeOfDayFactor = 0.85; // Red-eye: -15%
  price = Math.round(price * timeOfDayFactor);

  // 5. Loyalty Discount
  let loyaltyDiscount = 0;
  if (loyaltyTier === 'Silver') loyaltyDiscount = 0.05;
  else if (loyaltyTier === 'Gold') loyaltyDiscount = 0.10;
  else if (loyaltyTier === 'Platinum') loyaltyDiscount = 0.15;
  
  price = Math.round(price * (1 - loyaltyDiscount));

  return price;
}

/**
 * Calculates dynamic base price for a cabin class (e.g. for search list view)
 * @param {Object} flight - Flight document
 * @param {String} cabinClass - 'First', 'Business', 'Economy'
 * @param {String} loyaltyTier - 'Bronze', 'Silver', 'Gold', 'Platinum'
 * @returns {Number} - Base class price
 */
function getDynamicBasePrice(flight, cabinClass, loyaltyTier = 'Bronze') {
  // Use a middle seat type as the base cabin reference to avoid seat position premiums
  const mockMiddleSeat = { type: 'middle' };
  return calculateSeatPrice(flight, mockMiddleSeat, cabinClass, loyaltyTier);
}

module.exports = {
  calculateSeatPrice,
  getDynamicBasePrice
};

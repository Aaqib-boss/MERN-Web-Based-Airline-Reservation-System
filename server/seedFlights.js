const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Flight = require('./models/Flight');

dotenv.config({ path: __dirname + '/.env' });

const airports = require('../client/src/assets/airports.json');

const airlines = [
  { name: "SkyWave", color: "#0066CC", prefix: "SW" },
  { name: "Singapore Airlines", color: "#FFA500", prefix: "SQ" },
  { name: "Emirates", color: "#D71920", prefix: "EK" },
  { name: "British Airways", color: "#002060", prefix: "BA" },
  { name: "Lufthansa", color: "#FFCC00", prefix: "LH" },
  { name: "Qantas", color: "#E10000", prefix: "QF" }
];

const aircraftTypes = [
  { model: "Boeing 777-300ER", totalSeats: 180, firstClassRows: 2, businessClassRows: 4, economyClassRows: 24 },
  { model: "Boeing 787-9 Dreamliner", totalSeats: 180, firstClassRows: 2, businessClassRows: 4, economyClassRows: 24 },
  { model: "Airbus A350-900", totalSeats: 180, firstClassRows: 2, businessClassRows: 4, economyClassRows: 24 },
  { model: "Airbus A380-800", totalSeats: 180, firstClassRows: 2, businessClassRows: 4, economyClassRows: 24 }
];

const amenitiesList = [
  ["wifi", "meal", "entertainment", "power-outlet"],
  ["meal", "entertainment", "power-outlet"],
  ["wifi", "meal", "entertainment"],
  ["meal", "entertainment"],
  ["entertainment", "power-outlet"],
  ["wifi", "meal", "power-outlet"]
];

const generateSeatsForClass = (basePrice, startRow, endRow, seatTypeClass) => {
  const seats = [];
  const seatLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  for (let r = startRow; r <= endRow; r++) {
    seatLetters.forEach(letter => {
      let type = 'middle';
      if (letter === 'A' || letter === 'F') type = 'window';
      else if (letter === 'C' || letter === 'D') type = 'aisle';
      
      // Calculate seat price with position premiums
      let currentPrice = basePrice;
      if (type === 'window') currentPrice = Math.round(currentPrice * 1.20); // +20% window
      else if (type === 'aisle') currentPrice = Math.round(currentPrice * 1.10);  // +10% aisle

      seats.push({
        seatNumber: `${r}${letter}`,
        row: r,
        type,
        isAvailable: Math.random() > 0.15, // 15% prebooked
        lockedBy: null,
        lockedUntil: null,
        currentPrice
      });
    });
  }
  return seats;
};

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skywave';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding flights...');

    await Flight.deleteMany({});
    console.log('Cleared existing flights.');

    const flightsList = [];
    const now = new Date();
    const uniqueFlightNums = new Set();

    // Generate flights over a 30-day window
    for (let day = 0; day < 30; day++) {
      // Generate 2 flights per day to ensure at least 60 flights
      for (let fCount = 0; fCount < 2; fCount++) {
        // Randomly pick origin & destination
        let originIndex = Math.floor(Math.random() * airports.length);
        let destIndex = Math.floor(Math.random() * airports.length);
        while (originIndex === destIndex) {
          destIndex = Math.floor(Math.random() * airports.length);
        }

        const origin = airports[originIndex];
        const destination = airports[destIndex];

        // Random airline
        const airline = airlines[Math.floor(Math.random() * airlines.length)];
        
        let flightNumber;
        do {
          flightNumber = `${airline.prefix}-${100 + Math.floor(Math.random() * 900)}`;
        } while (uniqueFlightNums.has(flightNumber));
        uniqueFlightNums.add(flightNumber);

        // Random aircraft config
        const aircraft = aircraftTypes[Math.floor(Math.random() * aircraftTypes.length)];

        // Departure date & time offsets
        const departureDate = new Date(now);
        departureDate.setDate(now.getDate() + day);
        
        // Random time between 01:00 and 23:00
        const hour = 1 + Math.floor(Math.random() * 22);
        const minutes = Math.random() > 0.5 ? 0 : 30;
        departureDate.setHours(hour, minutes, 0, 0);

        // Flight duration estimation based on code distances (mock duration)
        // Set basic mock durations (long haul vs short haul)
        const isIndiaDomestic = (origin.country === 'India' && destination.country === 'India');
        const durationHours = isIndiaDomestic ? 2 : (Math.random() > 0.5 ? 8 : 14);
        const durationMins = Math.random() > 0.5 ? 0 : 45;
        
        const arrivalDate = new Date(departureDate);
        arrivalDate.setHours(departureDate.getHours() + durationHours);
        arrivalDate.setMinutes(departureDate.getMinutes() + durationMins);

        const durationStr = `${durationHours}h ${durationMins}m`;

        // Calculate economy base price
        const basePrice = isIndiaDomestic ? 4000 : (durationHours === 8 ? 22000 : 45000);

        // Generate seats grouped by cabin class
        const firstSeats = generateSeatsForClass(basePrice * 4.5, 1, aircraft.firstClassRows, 'First');
        const businessSeats = generateSeatsForClass(basePrice * 2.5, aircraft.firstClassRows + 1, aircraft.firstClassRows + aircraft.businessClassRows, 'Business');
        const economySeats = generateSeatsForClass(basePrice, aircraft.firstClassRows + aircraft.businessClassRows + 1, aircraft.firstClassRows + aircraft.businessClassRows + aircraft.economyClassRows, 'Economy');

        const cabinClasses = [
          { class: 'First', basePrice: Math.round(basePrice * 4.5), seats: firstSeats },
          { class: 'Business', basePrice: Math.round(basePrice * 2.5), seats: businessSeats },
          { class: 'Economy', basePrice: basePrice, seats: economySeats }
        ];

        // Sum available seats
        let availableSeats = 0;
        cabinClasses.forEach(cc => {
          cc.seats.forEach(s => {
            if (s.isAvailable) availableSeats++;
          });
        });

        const statusOptions = ['scheduled', 'scheduled', 'scheduled', 'scheduled', 'delayed', 'scheduled'];
        const status = day === 0 && hour < 12 ? 'boarding' : statusOptions[Math.floor(Math.random() * statusOptions.length)];

        flightsList.push({
          flightNumber,
          airline: airline.name,
          aircraft: aircraft.model,
          origin,
          destination,
          departureTime: departureDate,
          arrivalTime: arrivalDate,
          duration: durationStr,
          stops: durationHours > 6 ? [{ city: "LHR", layoverDuration: "1h 30m" }] : [],
          totalSeats: aircraft.totalSeats,
          availableSeats,
          cabinClasses,
          status,
          baggageAllowance: {
            cabin: isIndiaDomestic ? "7kg" : "10kg",
            checkin: isIndiaDomestic ? "15kg" : "30kg"
          },
          amenities: amenitiesList[Math.floor(Math.random() * amenitiesList.length)],
          demandScore: Math.floor(Math.random() * 100)
        });
      }
    }

    await Flight.insertMany(flightsList.slice(0, 50)); // Seed exactly 50 flights
    console.log(`Successfully seeded exactly 50 global flights in the database!`);
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`Seeding error: ${error.message}`);
    process.exit(1);
  }
};

seedDB();

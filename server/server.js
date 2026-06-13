const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const dotenv = require('dotenv');

// Load env configurations
dotenv.config({ path: __dirname + '/.env' });

// Database imports
const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const flightRoutes = require('./routes/flightRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const cardRoutes = require('./routes/cardRoutes');
const configRoutes = require('./routes/configRoutes');

// Middleware imports
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Initialize database connection
connectDB();

const app = express();

// Security middlewares
app.use(helmet());

const allowedOrigins = [
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3003',
  'http://127.0.0.1:3004'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
  },
  credentials: true
}));

// Body and Cookie parsers (increased payload size limit for base64 uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS attacks
app.use(xss());

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/users', cardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);

// Temporary one-time route to seed users without deleting existing data
app.get('/api/seed-users-temp', async (req, res) => {
  try {
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash('password123', salt);

    const demoUsers = [
      {
        name: 'SkyWave Traveler',
        email: 'user@skywave.com',
        passwordHash,
        role: 'user',
        loyaltyTier: 'Bronze',
        loyaltyPoints: 1200,
        passportNumber: 'Z1234567',
        nationality: 'India',
        dateOfBirth: '1995-05-15'
      },
      {
        name: 'SkyWave Operations Admin',
        email: 'admin@skywave.com',
        passwordHash,
        role: 'admin',
        loyaltyTier: 'Gold',
        loyaltyPoints: 18500,
        passportNumber: 'A7654321',
        nationality: 'United Kingdom',
        dateOfBirth: '1988-10-22'
      },
      {
        name: 'SkyWave System Director',
        email: 'superadmin@skywave.com',
        passwordHash,
        role: 'superadmin',
        loyaltyTier: 'Platinum',
        loyaltyPoints: 42000,
        passportNumber: 'S9876543',
        nationality: 'United States',
        dateOfBirth: '1980-01-01'
      }
    ];

    const results = [];
    for (const u of demoUsers) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create(u);
        results.push({ email: u.email, status: 'created' });
      } else {
        results.push({ email: u.email, status: 'already_exists' });
      }
    }

    res.json({
      success: true,
      message: 'Temporary user seeding completed successfully.',
      results
    });
  } catch (error) {
    console.error('Temp seeding error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Base route fallback
app.get('/', (req, res) => {
  res.send('SkyWave Airlines API Server is running...');
});

// 404 & Centralized Error Handler
app.use(notFound);
app.use(errorHandler);

const http = require('http');
const { initSocket } = require('./config/socketConfig');

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5002;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

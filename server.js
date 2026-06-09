require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quiz-platform';

async function connectDB() {
  try {
    // Try connecting to configured database with a 3-second timeout for quick fallback
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    console.log('Successfully connected to MongoDB.');
  } catch (err) {
    console.warn('MongoDB connection failed:', err.message);
    if (process.env.VERCEL) {
       console.error('Cannot run in-memory MongoDB on Vercel. Please configure MONGODB_URI.');
       return;
    }
    console.log('Attempting to spin up an in-memory MongoDB server as fallback...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      console.log(`In-memory MongoDB started at: ${mongoUri}`);
      await mongoose.connect(mongoUri);
      console.log('Successfully connected to in-memory MongoDB.');
    } catch (fallbackErr) {
      console.error('Failed to start in-memory MongoDB server:', fallbackErr);
      process.exit(1);
    }
  }
}

connectDB();

// Mount Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/quizzes', require('./routes/quizzes'));

// Fallback to SPA routing - send admin.html for admin/dashboard routes, or index.html for general routes if needed
// For our simple implementation, standard static files work, but let's make sure we have basic route mapping if users refresh
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/play', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Port configuration
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;

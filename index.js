const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import Routes (Ensure these files exist in your 'routes' folder)
const authRoutes = require('./routes/auth');
const entryRoutes = require('./routes/entries');

const app = express();

// 1. SOLID MIDDLEWARE
// Configured to allow Vercel and handle pre-flight requests
app.use(express.json());
app.use(cors({
    origin: "*", // Allows any frontend to connect. For tighter security later, replace with your Vercel URL.
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// 2. DATABASE CONNECTION
// Added options to handle connection stability
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("❌ ERROR: MONGO_URI is not defined in Environment Variables!");
}

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ ELGAN Database Connected Successfully"))
    .catch(err => {
        console.error("❌ MongoDB Connection Failed:");
        console.error(err.message);
    });

// 3. API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/entries', entryRoutes);

// 4. HEALTH CHECK / TEST ROUTE
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: "Success", 
        message: "ELGAN API is live and healthy" 
    });
});

// 5. GLOBAL 404 HANDLER
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// 6. SERVER INITIALIZATION
// '0.0.0.0' is critical for Render to properly map the external URL to the internal container
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ELGAN Server running on port ${PORT}`);
});
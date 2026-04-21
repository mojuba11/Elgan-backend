const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// --- 1. IMPORT ROUTES ---
const authRoutes = require('./routes/auth');
const entryRoutes = require('./routes/entries');
const financialRoutes = require('./routes/financials'); // NEW: Added financial route import

// Import User Model for the setup route
const User = require('./models/User');

const app = express();

// --- 2. DIRECTORY CHECK (Prevents Multer crashes) ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- 3. SOLID MIDDLEWARE ---
app.use(express.json());

// Updated CORS to be more explicit for Authorization headers
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// NEW: Serve the uploads folder statically so frontend can see images/PDFs
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- 4. DATABASE CONNECTION ---
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ ELGAN Database Connected Successfully"))
    .catch(err => {
        console.error("❌ MongoDB Connection Failed:", err.message);
    });

// --- 5. API ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/financials', financialRoutes); // NEW: Activated financial routes

// --- 6. SETUP ROUTE (Run this once in browser to create admin) ---
// URL: https://elgan-backend-2.onrender.com/setup-admin
app.get('/setup-admin', async (req, res) => {
    try {
        const userExists = await User.findOne({ username: 'admin' });
        if (userExists) return res.status(400).send("Admin already exists.");

        const hashedPassword = await bcrypt.hash('12345678', 10);
        const admin = new User({
            username: 'admin',
            password: hashedPassword,
            role: 'manager'
        });

        await admin.save();
        res.send("✅ Admin user 'admin' created with password '12345678'");
    } catch (err) {
        res.status(500).send("Error creating admin: " + err.message);
    }
});

// --- 7. HEALTH CHECK ---
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: "Success", 
        message: "ELGAN API is live and healthy" 
    });
});

// --- 8. GLOBAL 404 HANDLER ---
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// --- 9. SERVER INITIALIZATION ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ELGAN Server running on port ${PORT}`);
});

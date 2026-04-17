const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/auth');
const entryRoutes = require('./routes/entries');

// Import User Model for the setup route
const User = require('./models/User');

const app = express();

// 1. DIRECTORY CHECK (Prevents Multer crashes)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. SOLID MIDDLEWARE
app.use(express.json());
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// 3. DATABASE CONNECTION
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ ELGAN Database Connected Successfully"))
    .catch(err => {
        console.error("❌ MongoDB Connection Failed:", err.message);
    });

// 4. API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/entries', entryRoutes);

// 5. SETUP ROUTE (Run this once in browser to create admin)
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

// 6. HEALTH CHECK
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: "Success", 
        message: "ELGAN API is live and healthy" 
    });
});

// 7. GLOBAL 404 HANDLER
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});

// 8. SERVER INITIALIZATION
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ELGAN Server running on port ${PORT}`);
});
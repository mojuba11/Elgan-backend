const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); // Path to the model above
require('dotenv').config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const existing = await User.findOne({ username: 'admin' });
        if (existing) {
            console.log("Admin already exists in MongoDB Atlas.");
            process.exit();
        }

        const hashedPassword = await bcrypt.hash('1234556789', 10);
        const admin = new User({
            username: 'admin',
            password: hashedPassword,
            role: 'manager'
        });

        await admin.save();
        console.log("SUCCESS: 'admin' user created in the cloud database!");
        process.exit();
    } catch (err) {
        console.error("Seed Error:", err);
        process.exit(1);
    }
};

seedAdmin();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Assume a User model with email, password, and role

// LOGIN ROUTE
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Find user in MongoDB
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ msg: "User does not exist" });

        // 2. Validate Password (compare hashed password)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        // 3. Create Token with Role-Based Access
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({
            token,
            user: { id: user._id, username: user.username, role: user.role }
        });
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

module.exports = router;
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'wealthflow-fallback-secret';

// Login
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({ error: 'Identifier (email/code) and password are required' });
        }

        const normalizedIdentifier = identifier.toLowerCase().trim();
        const db = req.app.locals.db;

        // Find user by email or employee code
        const user = await db.collection('user_profiles').findOne({
            $or: [
                { email: normalizedIdentifier },
                { code: identifier.trim() },
                { employeeCode: identifier.trim() }
            ]
        });

        if (!user) {
            console.log('❌ User not found:', identifier);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.isActive === false) {
            return res.status(403).json({ error: 'Account is inactive' });
        }

        // Check password - handle both passwordHash and legacy password field
        const hash = user.passwordHash || user.password;
        if (!hash) {
            return res.status(401).json({ error: 'Account configuration error' });
        }

        const isMatch = await bcrypt.compare(password, hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                level: user.level
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Success - remove sensitive data
        const { passwordHash, password: _, ...userNoSensitive } = user;

        res.json({
            success: true,
            token,
            user: userNoSensitive
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user (Verify Token)
router.get('/me', authenticate, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const user = await db.collection('user_profiles').findOne({ id: req.user.id });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { passwordHash, password: _, ...userNoSensitive } = user;
        res.json({
            success: true,
            user: userNoSensitive
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user data' });
    }
});

// Status check
router.get('/status', async (req, res) => {
    // This is mostly for UI compatibility during migration
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.json({ authenticated: false });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ authenticated: true, user: decoded });
    } catch (err) {
        res.json({ authenticated: false });
    }
});

// Logout (mostly client-side with JWT, but provided for compatibility)
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logout successful' });
});

export default router;

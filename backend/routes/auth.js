import express from 'express';
import bcrypt from 'bcryptjs';
import passport from '../config/passport.js';

const router = express.Router();

// Middleware to check if user is authenticated
export function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
}

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, code, role, level } = req.body;

        console.log('📝 Registration attempt for:', email);

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        if (password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters' });
        }

        const db = req.app.locals.db;

        // Check if user already exists
        const existingUser = await db.collection('user_profiles').findOne({
            email: email.toLowerCase()
        });

        if (existingUser) {
            console.log('❌ User already exists:', email);
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user object
        const newUser = {
            id: `user_${Date.now()}`,
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            code: code || `USR-${Date.now()}`,
            role: role || 'OPS',
            level: level || 6,
            bankDetails: {
                accountName: '',
                accountNumber: '',
                bankName: '',
                ifscCode: ''
            },
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Insert into user_profiles
        await db.collection('user_profiles').insertOne(newUser);

        // Also insert into team collection for compatibility
        await db.collection('team').insertOne({
            ...newUser,
            password: hashedPassword // Store hashed password in team too
        });

        console.log('✅ User registered successfully:', email);

        // Auto-login after registration
        req.login(newUser, (err) => {
            if (err) {
                console.error('❌ Auto-login failed:', err);
                return res.status(500).json({ error: 'Registration successful but auto-login failed' });
            }

            res.json({
                success: true,
                message: 'Registration successful',
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    role: newUser.role,
                    level: newUser.level
                }
            });
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', (req, res, next) => {
    console.log('🔐 Login attempt for:', req.body.email);

    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('❌ Login error:', err);
            return res.status(500).json({ error: 'Login failed' });
        }

        if (!user) {
            console.log('❌ Login failed:', info.message);
            return res.status(401).json({ error: info.message || 'Invalid credentials' });
        }

        req.login(user, (err) => {
            if (err) {
                console.error('❌ Session creation failed:', err);
                return res.status(500).json({ error: 'Session creation failed' });
            }

            console.log('✅ Login successful for:', user.email);

            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    level: user.level
                }
            });
        });
    })(req, res, next);
});

// Logout
router.post('/logout', (req, res) => {
    const userEmail = req.user?.email;

    req.logout((err) => {
        if (err) {
            console.error('❌ Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }

        req.session.destroy((err) => {
            if (err) {
                console.error('❌ Session destroy error:', err);
                return res.status(500).json({ error: 'Session destroy failed' });
            }

            res.clearCookie('connect.sid');
            console.log('✅ Logout successful for:', userEmail);
            res.json({ success: true, message: 'Logout successful' });
        });
    });
});

// Get current user
router.get('/me', isAuthenticated, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            level: req.user.level
        }
    });
});

// Check authentication status
router.get('/status', (req, res) => {
    res.json({
        authenticated: req.isAuthenticated(),
        user: req.isAuthenticated() ? {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            level: req.user.level
        } : null
    });
});

export default router;

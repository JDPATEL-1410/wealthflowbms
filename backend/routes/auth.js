import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'wealthflow-fallback-secret';

// Login Route
router.post('/login', (req, res, next) => {
  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal login error' });
    }
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }

    try {
      // Generate JWT
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          level: user.level
        },
        EFFECTIVE_JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        token,
        user // user object already has sensitive fields removed by strategy
      });
    } catch (tokenError) {
      console.error('Token generation error:', tokenError);
      return res.status(500).json({ error: 'Failed to generate token' });
    }
  })(req, res, next);
});

// Get current user (Protected)
router.get('/me', authenticate, (req, res) => {
  // req.user is populated by passport-jwt in the authenticate middleware
  return res.json({
    success: true,
    user: req.user
  });
});

// Status check (Public - returns auth state)
router.get('/status', (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err || !user) {
      return res.json({ authenticated: false });
    }
    return res.json({ authenticated: true, user });
  })(req, res, next);
});

// Logout (client-side with JWT)
router.post('/logout', (req, res) => {
  return res.json({ success: true, message: 'Logout successful' });
});

export default router;

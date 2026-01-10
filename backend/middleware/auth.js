import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.warn('⚠️ JWT_SECRET is missing. Set JWT_SECRET in Render environment variables.');
}

// Fallback only for local dev to prevent crashing.
// In production, you MUST set JWT_SECRET in env.
const EFFECTIVE_JWT_SECRET = JWT_SECRET || 'wealthflow-fallback-secret';

// Middleware to verify JWT token
export const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers?.authorization || '';
        const parts = authHeader.split(' ').filter(Boolean);

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = parts[1];
        const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET);

        // Expected decoded fields: id, email, role, level
        req.user = decoded;
        return next();
    } catch (error) {
        console.error('JWT Verification Error:', error.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Middleware to restrict access to ADMIN only
export const isAdmin = (req, res, next) => {
    if (req.user?.role === 'ADMIN') {
        return next();
    }
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
};

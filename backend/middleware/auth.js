import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'wealthflow-fallback-secret';

// Middleware to verify JWT token
export const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;
        next();
    } catch (error) {
        console.error('JWT Verification Error:', error.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Middleware to restrict access to ADMIN only
export const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
    }
};

import passport from 'passport';

// Middleware to verify JWT token using Passport
export const authenticate = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
            console.error('Passport Auth Error:', err);
            return res.status(500).json({ error: 'Authentication error' });
        }
        if (!user) {
            // info contains the specific error (e.g., 'No auth token', 'jwt expired')
            const message = info ? info.message : 'Invalid or expired token';
            return res.status(401).json({ error: message });
        }
        req.user = user;
        next();
    })(req, res, next);
};

// Middleware to restrict access to ADMIN only
export const isAdmin = (req, res, next) => {
    if (req.user?.role === 'ADMIN') {
        return next();
    }
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
};

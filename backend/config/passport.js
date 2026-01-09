import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';

// This will be set by server.js
let db = null;

export function setDatabase(database) {
    db = database;
}

// Configure Passport Local Strategy
passport.use(new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    async (email, password, done) => {
        try {
            console.log('🔐 Attempting login for:', email);

            // Find user in user_profiles collection
            const user = await db.collection('user_profiles').findOne({
                email: email.toLowerCase()
            });

            if (!user) {
                console.log('❌ User not found:', email);
                return done(null, false, { message: 'Invalid email or password' });
            }

            // Check if user is active
            if (user.isActive === false) {
                console.log('❌ User is inactive:', email);
                return done(null, false, { message: 'Account is inactive' });
            }

            // Compare password
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                console.log('❌ Invalid password for:', email);
                return done(null, false, { message: 'Invalid email or password' });
            }

            console.log('✅ Login successful for:', email);
            return done(null, user);
        } catch (error) {
            console.error('❌ Login error:', error);
            return done(error);
        }
    }
));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await db.collection('user_profiles').findOne({ id });
        done(null, user);
    } catch (error) {
        done(error);
    }
});

export default passport;

import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'wealthflow-fallback-secret';

export default function configurePassport(passport, db) {
    // Local Strategy for Login
    // Expects 'identifier' (email or code) and 'password' in the request body
    passport.use(
        new LocalStrategy(
            {
                usernameField: 'identifier',
                passwordField: 'password',
                session: false
            },
            async (identifier, password, done) => {
                try {
                    const email = identifier.toLowerCase().trim();
                    const code = identifier.trim();

                    // Find user by email, code, or employeeCode
                    const user = await db.collection('user_profiles').findOne({
                        $or: [{ email: email }, { code: code }, { employeeCode: code }]
                    });

                    if (!user) {
                        return done(null, false, { message: 'Invalid credentials' });
                    }

                    if (user.isActive === false) {
                        return done(null, false, { message: 'Account is inactive' });
                    }

                    const stored = user.passwordHash || user.password;
                    if (!stored) {
                        return done(null, false, { message: 'Account configuration error' });
                    }

                    let isMatch = false;
                    // Check bcrypt hash or legacy password
                    if (stored.startsWith('$2')) {
                        isMatch = await bcrypt.compare(password, stored);
                    } else {
                        isMatch = (password === stored);
                        // Auto-migrate legacy password to hash
                        if (isMatch) {
                            const newHash = await bcrypt.hash(password, 10);
                            await db.collection('user_profiles').updateOne(
                                { _id: user._id },
                                {
                                    $set: { passwordHash: newHash, updatedAt: new Date().toISOString() },
                                    $unset: { password: '' }
                                }
                            );
                        }
                    }

                    if (!isMatch) {
                        return done(null, false, { message: 'Invalid credentials' });
                    }

                    // Remove sensitive fields
                    const { passwordHash, password: _pw, ...userNoSensitive } = user;
                    return done(null, userNoSensitive);
                } catch (error) {
                    return done(error);
                }
            }
        )
    );

    // JWT Strategy for Token Verification
    const jwtOptions = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: JWT_SECRET
    };

    passport.use(
        new JwtStrategy(jwtOptions, async (jwtPayload, done) => {
            try {
                // Determine user ID from payload
                const userId = jwtPayload.id;

                // Fetch fresh user data from DB to ensure they still exist/are active
                const user = await db.collection('user_profiles').findOne({ id: userId });

                if (user) {
                    // Check if still active
                    if (user.isActive === false) {
                        return done(null, false);
                    }
                    const { passwordHash, password: _pw, ...userNoSensitive } = user;
                    return done(null, userNoSensitive);
                } else {
                    return done(null, false);
                }
            } catch (error) {
                return done(error, false);
            }
        })
    );
}

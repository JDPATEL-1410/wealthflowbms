import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

function normalizeEmail(value) {
    return String(value || '').toLowerCase().trim();
}

function normalizeCode(value) {
    return String(value || '').trim();
}

function normalizeLevel(value) {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}

function sanitizeUser(userDoc) {
    if (!userDoc) return userDoc;
    // Remove sensitive fields safely
    // eslint-disable-next-line no-unused-vars
    const { passwordHash, password, ...safe } = userDoc;
    return safe;
}

// GET all users (Admin only)
router.get('/', authenticate, isAdmin, async (req, res) => {
    try {
        const db = req.app.locals.db;
        if (!db) return res.status(500).json({ error: 'Database not initialized' });

        const users = await db
            .collection('user_profiles')
            .find(
                {},
                {
                    projection: { passwordHash: 0, password: 0 }
                }
            )
            .toArray();

        res.json(users);
    } catch (error) {
        console.error('Fetch Users Error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST create user (Admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const { fullName, employeeCode, role, hierarchyLevel, email, password } = req.body;
        const db = req.app.locals.db;
        if (!db) return res.status(500).json({ error: 'Database not initialized' });

        // Validation
        if (!fullName || !employeeCode || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (String(password).length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters' });
        }

        const normalizedEmail = normalizeEmail(email);
        const trimmedCode = normalizeCode(employeeCode);
        const levelNum = normalizeLevel(hierarchyLevel);

        // Check for existing user (support both code + employeeCode fields)
        const existing = await db.collection('user_profiles').findOne({
            $or: [
                { email: normalizedEmail },
                { code: trimmedCode },
                { employeeCode: trimmedCode }
            ]
        });

        if (existing) {
            return res.status(400).json({ error: 'User with this email or employee code already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(String(password), 10);

        const now = new Date().toISOString();

        const newUser = {
            id: `user_${Date.now()}`,
            name: String(fullName).trim(),
            fullName: String(fullName).trim(),
            code: trimmedCode,
            employeeCode: trimmedCode,
            role: role || 'OPS',
            level: levelNum ?? hierarchyLevel ?? 6,
            hierarchyLevel: levelNum ?? hierarchyLevel ?? 6,
            email: normalizedEmail,
            passwordHash,
            isActive: true,
            createdAt: now,
            updatedAt: now
        };

        await db.collection('user_profiles').insertOne(newUser);

        res.status(201).json(sanitizeUser(newUser));
    } catch (error) {
        console.error('Create User Error:', error);

        // Handle Mongo duplicate key errors cleanly
        if (error && error.code === 11000) {
            return res.status(400).json({ error: 'User with this email or employee code already exists' });
        }

        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT update user (Admin or Self)
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, employeeCode, role, hierarchyLevel, email, password, isActive, bankDetails, address } = req.body;

        const db = req.app.locals.db;
        if (!db) return res.status(500).json({ error: 'Database not initialized' });

        // Security: only ADMIN can change role/level/isActive of others
        const isSelf = req.user?.id === id;
        const admin = req.user?.role === 'ADMIN';

        if (!isSelf && !admin) {
            return res.status(403).json({ error: 'Unauthorized to update this user' });
        }

        const updates = { updatedAt: new Date().toISOString() };

        if (fullName) {
            updates.fullName = String(fullName).trim();
            updates.name = String(fullName).trim();
        }

        if (employeeCode) {
            const c = normalizeCode(employeeCode);
            updates.employeeCode = c;
            updates.code = c;
        }

        if (email) {
            updates.email = normalizeEmail(email);
        }

        // Admin-only fields
        if (admin) {
            if (role) updates.role = role;

            const lvl = normalizeLevel(hierarchyLevel);
            if (lvl !== undefined) {
                updates.hierarchyLevel = lvl;
                updates.level = lvl;
            }

            if (isActive !== undefined) updates.isActive = isActive;
        }

        if (bankDetails) updates.bankDetails = bankDetails;
        if (address) updates.address = address;

        if (password && String(password).length >= 4) {
            updates.passwordHash = await bcrypt.hash(String(password), 10);
            // Remove any legacy plaintext if it exists
            updates.password = undefined;
        }

        const result = await db.collection('user_profiles').findOneAndUpdate(
            { id: id },
            {
                $set: updates,
                ...(updates.password === undefined ? { $unset: { password: '' } } : {})
            },
            { returnDocument: 'after' }
        );

        const updatedUser = result?.value;

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(sanitizeUser(updatedUser));
    } catch (error) {
        console.error('Update User Error:', error);

        if (error && error.code === 11000) {
            return res.status(400).json({ error: 'Email or employee code already exists' });
        }

        res.status(500).json({ error: 'Failed to update user' });
    }
});

export default router;

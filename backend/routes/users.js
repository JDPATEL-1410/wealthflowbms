import express from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET all users (Admin only)
router.get('/', authenticate, isAdmin, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const users = await db.collection('user_profiles').find({}, { projection: { passwordHash: 0 } }).toArray();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// POST create user (Admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const { fullName, employeeCode, role, hierarchyLevel, email, password } = req.body;
        const db = req.app.locals.db;

        // Validation
        if (!fullName || !employeeCode || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (password.length < 4) {
            return res.status(400).json({ error: 'Password must be at least 4 characters' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const trimmedCode = employeeCode.trim();

        // Check for existing user
        const existing = await db.collection('user_profiles').findOne({
            $or: [{ email: normalizedEmail }, { code: trimmedCode }]
        });

        if (existing) {
            return res.status(400).json({ error: 'User with this email or employee code already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = {
            id: `user_${Date.now()}`,
            name: fullName,
            fullName,
            code: trimmedCode,
            employeeCode: trimmedCode,
            role,
            level: hierarchyLevel,
            hierarchyLevel,
            email: normalizedEmail,
            passwordHash,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        await db.collection('user_profiles').insertOne(newUser);

        // Return user without passwordHash
        const { passwordHash: _, ...userResponse } = newUser;
        res.status(201).json(userResponse);
    } catch (error) {
        console.error('Create User Error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT update user (Admin or Self)
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { fullName, employeeCode, role, hierarchyLevel, email, password, isActive, bankDetails, address } = req.body;
        const db = req.app.locals.db;

        // Security: only ADMIN can change role/level/isActive of others
        if (req.user.id !== id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized to update this user' });
        }

        const updates = { updatedAt: new Date().toISOString() };
        if (fullName) {
            updates.fullName = fullName;
            updates.name = fullName;
        }
        if (employeeCode) {
            updates.employeeCode = employeeCode.trim();
            updates.code = employeeCode.trim();
        }
        if (email) updates.email = email.toLowerCase().trim();

        // Admin-only fields
        if (req.user.role === 'ADMIN') {
            if (role) updates.role = role;
            if (hierarchyLevel !== undefined) {
                updates.hierarchyLevel = hierarchyLevel;
                updates.level = hierarchyLevel;
            }
            if (isActive !== undefined) updates.isActive = isActive;
        }

        if (bankDetails) updates.bankDetails = bankDetails;
        if (address) updates.address = address;

        if (password && password.length >= 4) {
            updates.passwordHash = await bcrypt.hash(password, 10);
        }

        const result = await db.collection('user_profiles').findOneAndUpdate(
            { id: id },
            { $set: updates },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { passwordHash: _, ...userResponse } = result;
        res.json(userResponse);
    } catch (error) {
        console.error('Update User Error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

export default router;

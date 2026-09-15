import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, Role } from '../auth/JwtAuthMiddleware';

export const authRouter = Router();

// Hardcoded demo users (in production: fetch from PostgreSQL)
const DEMO_USERS = [
    { id: 'u-001', email: 'admin@fraud.io', passwordHash: bcrypt.hashSync('Admin@1234', 10), role: Role.ADMIN },
    { id: 'u-002', email: 'analyst@fraud.io', passwordHash: bcrypt.hashSync('Analyst@1234', 10), role: Role.ANALYST },
];

/**
 * POST /api/auth/login
 * Issues a signed JWT on valid credentials
 */
authRouter.post('/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
    }

    const user = DEMO_USERS.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        res.status(401).json({ error: 'Invalid credentials.' });
        return;
    }

    const token = generateToken({ userId: user.id, email: user.email, role: user.role });
    res.json({ token, role: user.role, message: 'Login successful.' });
});

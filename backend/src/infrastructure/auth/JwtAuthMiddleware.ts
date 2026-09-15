import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export enum Role {
    ANALYST = 'analyst',
    ADMIN = 'admin',
    READONLY = 'readonly'
}

export interface JwtPayload {
    userId: string;
    email: string;
    role: Role;
    iat?: number;
    exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fraud-engine-secret-dev-only';

/**
 * generateToken — issues a signed JWT for a user session
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

/**
 * authenticate — Express middleware that validates Bearer JWT token
 * Attaches decoded payload to req.user
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: No token provided' });
        return;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
        (req as any).user = decoded;
        next();
    } catch {
        res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
}

/**
 * authorize — RBAC middleware factory
 * Usage: router.get('/admin-only', authenticate, authorize(Role.ADMIN), handler)
 */
export function authorize(...allowedRoles: Role[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const user = (req as any).user as JwtPayload;
        if (!user || !allowedRoles.includes(user.role)) {
            res.status(403).json({
                error: `Forbidden: Requires one of [${allowedRoles.join(', ')}]`
            });
            return;
        }
        next();
    };
}

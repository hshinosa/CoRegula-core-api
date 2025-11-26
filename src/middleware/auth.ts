import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from './errorHandler.js';

export interface JwtPayload {
    userId: string;
    email: string;
    role: 'student' | 'lecturer' | 'admin';
}

export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}

/**
 * Verify JWT token and attach user to request
 */
export function verifyToken(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw ApiError.unauthorized('No token provided');
        }

        const token = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw ApiError.internal('JWT secret not configured');
        }

        const decoded = jwt.verify(token, secret) as JwtPayload;
        req.user = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            next(ApiError.unauthorized('Invalid token'));
        } else if (error instanceof jwt.TokenExpiredError) {
            next(ApiError.unauthorized('Token expired'));
        } else {
            next(error);
        }
    }
}

/**
 * Check if user has required role
 */
export function checkRole(allowedRoles: Array<'student' | 'lecturer' | 'admin'>) {
    return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next(ApiError.unauthorized('Not authenticated'));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(ApiError.forbidden(`Access denied. Required role: ${allowedRoles.join(' or ')}`));
        }

        next();
    };
}

/**
 * Shorthand: Require lecturer role
 */
export const requireLecturer = checkRole(['lecturer', 'admin']);

/**
 * Shorthand: Require student role
 */
export const requireStudent = checkRole(['student']);

/**
 * Shorthand: Require any authenticated user
 */
export const requireAuth = verifyToken;

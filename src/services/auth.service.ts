import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { ApiError } from '../middleware/errorHandler.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';
import { JwtPayload } from '../middleware/auth.js';

const SALT_ROUNDS = 10;

export class AuthService {
    /**
     * Register a new user
     */
    static async register(data: RegisterInput) {
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (existingUser) {
            throw ApiError.conflict('Email already registered');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

        // Create user
        const user = await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: hashedPassword,
                role: data.role,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        // Generate JWT token for auto-login after registration
        const token = this.generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        return {
            token,
            user,
        };
    }

    /**
     * Login user and return JWT token
     */
    static async login(data: LoginInput) {
        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: data.email },
        });

        if (!user) {
            throw ApiError.unauthorized('Invalid email or password');
        }

        if (!user.isActive) {
            throw ApiError.forbidden('Account is deactivated');
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(data.password, user.password);

        if (!isValidPassword) {
            throw ApiError.unauthorized('Invalid email or password');
        }

        // Generate JWT
        const token = this.generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    }

    /**
     * Get current user profile
     */
    static async getProfile(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw ApiError.notFound('User not found');
        }

        return user;
    }

    /**
     * Generate JWT token
     */
    private static generateToken(payload: JwtPayload): string {
        const secret = process.env.JWT_SECRET;
        const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

        if (!secret) {
            throw ApiError.internal('JWT secret not configured');
        }

        return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
    }
}

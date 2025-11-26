import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../middleware/errorHandler.js';

/**
 * Middleware factory for validating request body with Zod schema
 */
export function validateBody<T>(schema: ZodSchema<T>) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const details = error.errors.reduce(
                    (acc, err) => {
                        const path = err.path.join('.');
                        acc[path] = err.message;
                        return acc;
                    },
                    {} as Record<string, string>
                );

                next(ApiError.badRequest('Validation failed', details));
            } else {
                next(error);
            }
        }
    };
}

/**
 * Middleware factory for validating request params with Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            req.params = schema.parse(req.params) as Record<string, string>;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                next(ApiError.badRequest('Invalid parameters'));
            } else {
                next(error);
            }
        }
    };
}

/**
 * Middleware factory for validating request query with Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            req.query = schema.parse(req.query) as Record<string, string>;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                next(ApiError.badRequest('Invalid query parameters'));
            } else {
                next(error);
            }
        }
    };
}

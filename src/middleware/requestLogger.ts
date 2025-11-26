import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // Log request
    logger.info(`→ ${req.method} ${req.path}`);

    // Log response time on finish
    _res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = _res.statusCode;
        const level = statusCode >= 400 ? 'warn' : 'info';

        logger[level](`← ${req.method} ${req.path} ${statusCode} ${duration}ms`);
    });

    next();
}

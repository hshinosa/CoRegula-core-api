import { Response, NextFunction } from 'express';
import { ReflectionService } from '../services/reflection.service.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class ReflectionController {
    /**
     * POST /api/reflections
     * Submit a reflection (student only)
     */
    static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const reflection = await ReflectionService.createReflection(req.body, req.user!.userId);

            res.status(201).json({
                data: reflection,
                meta: {
                    message: 'Reflection submitted successfully',
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/reflections/me
     * Get my reflections
     */
    static async getMyReflections(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const reflections = await ReflectionService.getMyReflections(req.user!.userId);

            res.json({
                data: reflections,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/reflections/goal/:goalId
     * Get reflections for a goal
     */
    static async getGoalReflections(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const reflections = await ReflectionService.getGoalReflections(
                req.params.goalId,
                req.user!.userId,
                req.user!.role
            );

            res.json({
                data: reflections,
            });
        } catch (error) {
            next(error);
        }
    }
}

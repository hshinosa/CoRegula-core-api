import { Router } from 'express';
import { ReflectionController } from '../controllers/reflection.controller.js';
import { verifyToken, requireStudent } from '../middleware/auth.js';
import { validateBody } from '../validators/validate.js';
import { createReflectionSchema } from '../validators/reflection.validator.js';

const router = Router();

// All routes require authentication
router.use(verifyToken);

// Reflection routes
router.post('/', requireStudent, validateBody(createReflectionSchema), ReflectionController.create);
router.get('/me', ReflectionController.getMyReflections);
router.get('/goal/:goalId', ReflectionController.getGoalReflections);

export default router;

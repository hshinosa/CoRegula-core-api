import { Router } from 'express';
import multer from 'multer';
import { CourseController } from '../controllers/course.controller.js';
import { GroupController } from '../controllers/group.controller.js';
import { verifyToken, requireLecturer, requireStudent } from '../middleware/auth.js';
import { validateBody } from '../validators/validate.js';
import { createCourseSchema, joinCourseSchema } from '../validators/course.validator.js';
import { createGroupSchema, addMembersSchema } from '../validators/group.validator.js';

const router = Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
});

// All routes require authentication
router.use(verifyToken);

// Course CRUD
router.post('/', requireLecturer, validateBody(createCourseSchema), CourseController.create);
router.post('/join', requireStudent, validateBody(joinCourseSchema), CourseController.join);

// IMPORTANT: Specific routes MUST come before :id routes
router.get('/enrolled', requireStudent, CourseController.enrolled);
router.get('/my', CourseController.index);
router.get('/', CourseController.index); // Alias for /my

// Course by ID routes
router.get('/:id', CourseController.show);
router.get('/:id/my-group', requireStudent, CourseController.getMyGroup);
router.get('/:id/my-goal', requireStudent, CourseController.getMyGoal);

// Course students (lecturer and enrolled students can access)
router.get('/:id/students', CourseController.getStudents);

// Course groups (lecturer and students can create/view)
router.get('/:id/groups', GroupController.getCourseGroups);
router.post('/:id/groups', validateBody(createGroupSchema), GroupController.createInCourse);
router.post('/:id/groups/:groupId/members', requireLecturer, validateBody(addMembersSchema), GroupController.addMembers);

// Knowledge base
router.post('/:id/knowledge-base', requireLecturer, upload.single('file'), CourseController.uploadKnowledgeBase);
router.get('/:id/knowledge-base', CourseController.getKnowledgeBase);

export default router;

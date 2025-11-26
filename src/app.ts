import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiter } from './middleware/rateLimiter.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import courseRoutes from './routes/course.routes.js';
import groupRoutes from './routes/group.routes.js';
import goalRoutes from './routes/goal.routes.js';
import reflectionRoutes from './routes/reflection.routes.js';
import aiChatRoutes from './routes/aiChat.routes.js';
import chatSpaceRoutes from './routes/chatSpace.routes.js';
import healthRoutes from './routes/health.routes.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
    process.env.CLIENT_URL || 'http://localhost:8000',
    'http://localhost:8000',
    'http://localhost:8080',
    'http://127.0.0.1:8000',
    'http://127.0.0.1:8080',
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);
            
            if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use(rateLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/reflections', reflectionRoutes);
app.use('/api/ai-chats', aiChatRoutes);
app.use('/api/chat-spaces', chatSpaceRoutes);
app.use('/health', healthRoutes);

// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: 'The requested resource was not found',
        },
    });
});

// Global error handler
app.use(errorHandler);

export default app;

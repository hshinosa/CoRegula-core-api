import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export async function connectMongoDB(): Promise<void> {
    const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017/coregula';

    try {
        await mongoose.connect(mongoUrl);
        logger.info('✅ Connected to MongoDB');
    } catch (error) {
        logger.error('❌ MongoDB connection error:', error);
        // Don't throw - MongoDB is optional for MVP, chat logs will be skipped
        logger.warn('⚠️ Continuing without MongoDB - chat logs will not be persisted');
    }
}

export async function disconnectMongoDB(): Promise<void> {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
}

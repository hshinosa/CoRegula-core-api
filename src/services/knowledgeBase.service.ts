import path from 'node:path';
import fs from 'node:fs/promises';
import prisma from '../config/database.js';
import { ApiError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

interface UploadedFile {
    originalname: string;
    mimetype: string;
    size: number;
    buffer: Buffer;
}

export class KnowledgeBaseService {
    /**
     * Upload a PDF file to knowledge base
     */
    static async uploadFile(courseId: string, file: UploadedFile, lecturerId: string) {
        // Verify course ownership
        const course = await prisma.course.findUnique({
            where: { id: courseId },
        });

        if (!course) {
            throw ApiError.notFound('Course not found');
        }

        if (course.ownerId !== lecturerId) {
            throw ApiError.forbidden('You do not own this course');
        }

        // Validate file type
        if (file.mimetype !== 'application/pdf') {
            throw ApiError.badRequest('Only PDF files are allowed');
        }

        // Validate file size (10MB max)
        const maxSize = (Number(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024;
        if (file.size > maxSize) {
            throw ApiError.badRequest(`File size must be less than ${maxSize / 1024 / 1024}MB`);
        }

        // Create upload directory if it doesn't exist
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        const courseDir = path.join(uploadDir, courseId);
        await fs.mkdir(courseDir, { recursive: true });

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${timestamp}_${sanitizedName}`;
        const filePath = path.join(courseDir, fileName);

        // Save file to disk
        await fs.writeFile(filePath, file.buffer);

        // Create database record
        const knowledgeBase = await prisma.knowledgeBase.create({
            data: {
                fileName: file.originalname,
                filePath,
                fileSize: file.size,
                mimeType: file.mimetype,
                vectorStatus: 'pending',
                courseId,
                uploadedBy: lecturerId,
            },
        });

        // Trigger AI Engine ingestion (async, don't wait)
        this.sendToAIEngine(knowledgeBase.id, filePath, courseId, file.originalname).catch((err) => {
            logger.error('Failed to send file to AI Engine:', err);
        });

        return {
            id: knowledgeBase.id,
            fileName: knowledgeBase.fileName,
            status: knowledgeBase.vectorStatus,
            uploadedAt: knowledgeBase.uploadedAt,
        };
    }

    /**
     * Get knowledge base files for a course
     */
    static async getCourseFiles(courseId: string, userId: string, role: string) {
        const course = await prisma.course.findUnique({
            where: { id: courseId },
        });

        if (!course) {
            throw ApiError.notFound('Course not found');
        }

        // Check access
        if (role === 'lecturer') {
            if (course.ownerId !== userId) {
                throw ApiError.forbidden('You do not own this course');
            }
        } else {
            const enrollment = await prisma.courseStudent.findUnique({
                where: {
                    courseId_userId: {
                        courseId,
                        userId,
                    },
                },
            });

            if (!enrollment) {
                throw ApiError.forbidden('You are not enrolled in this course');
            }
        }

        const files = await prisma.knowledgeBase.findMany({
            where: { courseId },
            select: {
                id: true,
                fileName: true,
                fileSize: true,
                vectorStatus: true,
                uploadedAt: true,
                processedAt: true,
            },
            orderBy: { uploadedAt: 'desc' },
        });

        return files;
    }

    /**
     * Send file to AI Engine for vector processing
     */
    private static async sendToAIEngine(
        fileId: string,
        filePath: string,
        courseId: string,
        fileName: string
    ) {
        const aiEngineUrl = process.env.AI_ENGINE_URL;

        if (!aiEngineUrl) {
            logger.warn('AI_ENGINE_URL not configured, skipping ingestion');
            return;
        }

        try {
            // Update status to processing
            await prisma.knowledgeBase.update({
                where: { id: fileId },
                data: { vectorStatus: 'processing' },
            });

            // Read file
            const fileBuffer = await fs.readFile(filePath);

            // Create form data
            const formData = new FormData();
            formData.append('file', new Blob([fileBuffer]), fileName);
            formData.append('course_id', courseId);
            formData.append('file_id', fileId);

            // Send to AI Engine
            const response = await fetch(`${aiEngineUrl}/ingest`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`AI Engine responded with ${response.status}`);
            }

            // Update status to ready
            await prisma.knowledgeBase.update({
                where: { id: fileId },
                data: {
                    vectorStatus: 'ready',
                    processedAt: new Date(),
                },
            });

            logger.info(`File ${fileName} processed successfully`);
        } catch (error) {
            logger.error('AI Engine ingestion failed:', error);

            // Update status to failed
            await prisma.knowledgeBase.update({
                where: { id: fileId },
                data: {
                    vectorStatus: 'failed',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                },
            });
        }
    }

    /**
     * Delete a knowledge base file
     */
    static async deleteFile(fileId: string, lecturerId: string) {
        const file = await prisma.knowledgeBase.findUnique({
            where: { id: fileId },
            include: {
                course: {
                    select: { ownerId: true },
                },
            },
        });

        if (!file) {
            throw ApiError.notFound('File not found');
        }

        if (file.course.ownerId !== lecturerId) {
            throw ApiError.forbidden('You do not own this course');
        }

        // Delete file from disk
        try {
            await fs.unlink(file.filePath);
        } catch {
            logger.warn(`Failed to delete file from disk: ${file.filePath}`);
        }

        // Delete database record
        await prisma.knowledgeBase.delete({
            where: { id: fileId },
        });

        return { success: true };
    }
}

import { Response, NextFunction } from 'express';
import { AiChatService } from '../services/aiChat.service.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class AiChatController {
    /**
     * POST /api/ai-chats
     * Create a new AI chat
     */
    static async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const chat = await AiChatService.createChat(req.user!.userId, req.body.title);

            res.status(201).json({
                data: chat,
                meta: {
                    message: 'Chat created successfully',
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/ai-chats
     * Get all chats for the current user
     */
    static async index(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const chats = await AiChatService.getUserChats(req.user!.userId);

            res.json({
                data: chats,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/ai-chats/:id
     * Get a specific chat with messages
     */
    static async show(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const chat = await AiChatService.getChat(req.params.id, req.user!.userId);

            res.json({
                data: chat,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/ai-chats/:id/messages
     * Send a message to AI and get response
     */
    static async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { content } = req.body;
            const result = await AiChatService.sendMessage(req.params.id, req.user!.userId, content);

            res.json({
                data: result,
                meta: {
                    message: 'Message sent successfully',
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PATCH /api/ai-chats/:id
     * Update chat title
     */
    static async updateTitle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            const { title } = req.body;
            const chat = await AiChatService.updateChatTitle(req.params.id, req.user!.userId, title);

            res.json({
                data: chat,
                meta: {
                    message: 'Chat updated successfully',
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/ai-chats/:id
     * Delete a chat
     */
    static async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
        try {
            await AiChatService.deleteChat(req.params.id, req.user!.userId);

            res.json({
                data: null,
                meta: {
                    message: 'Chat deleted successfully',
                },
            });
        } catch (error) {
            next(error);
        }
    }
}

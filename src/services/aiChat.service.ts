import prisma from '../config/database.js';
import { ApiError } from '../middleware/errorHandler.js';

export class AiChatService {
    /**
     * Create a new AI chat conversation
     */
    static async createChat(userId: string, title?: string) {
        const chat = await prisma.aiChat.create({
            data: {
                title: title || 'Chat Baru',
                userId,
            },
        });

        return {
            id: chat.id,
            title: chat.title,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
        };
    }

    /**
     * Get all chats for a user
     */
    static async getUserChats(userId: string) {
        const chats = await prisma.aiChat.findMany({
            where: { userId },
            orderBy: { updatedAt: 'desc' },
            include: {
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        return chats.map((chat) => ({
            id: chat.id,
            title: chat.title,
            lastMessage: chat.messages[0]?.content,
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
        }));
    }

    /**
     * Get a specific chat with messages
     */
    static async getChat(chatId: string, userId: string) {
        const chat = await prisma.aiChat.findUnique({
            where: { id: chatId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!chat) {
            throw ApiError.notFound('Chat not found');
        }

        if (chat.userId !== userId) {
            throw ApiError.forbidden('You do not have access to this chat');
        }

        return {
            id: chat.id,
            title: chat.title,
            messages: chat.messages.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: m.createdAt,
            })),
            createdAt: chat.createdAt,
            updatedAt: chat.updatedAt,
        };
    }

    /**
     * Add a message to a chat
     */
    static async addMessage(chatId: string, userId: string, role: 'user' | 'assistant', content: string) {
        const chat = await prisma.aiChat.findUnique({
            where: { id: chatId },
        });

        if (!chat) {
            throw ApiError.notFound('Chat not found');
        }

        if (chat.userId !== userId) {
            throw ApiError.forbidden('You do not have access to this chat');
        }

        const message = await prisma.aiChatMessage.create({
            data: {
                chatId,
                role,
                content,
            },
        });

        // Update chat title if it's the first user message
        if (role === 'user') {
            const messageCount = await prisma.aiChatMessage.count({
                where: { chatId, role: 'user' },
            });

            if (messageCount === 1) {
                // Use first 50 chars of first message as title
                const newTitle = content.length > 50 ? content.substring(0, 47) + '...' : content;
                await prisma.aiChat.update({
                    where: { id: chatId },
                    data: { title: newTitle },
                });
            }
        }

        // Update chat's updatedAt
        await prisma.aiChat.update({
            where: { id: chatId },
            data: { updatedAt: new Date() },
        });

        return {
            id: message.id,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
        };
    }

    /**
     * Send a message and get AI response
     */
    static async sendMessage(chatId: string, userId: string, content: string) {
        // Add user message
        const userMessage = await this.addMessage(chatId, userId, 'user', content);

        // TODO: Integrate with actual AI service (OpenAI, Gemini, etc.)
        // For now, return a placeholder response
        const aiResponse = `Ini adalah respons placeholder dari AI. Pesan Anda: "${content}"`;

        // Add AI response
        const assistantMessage = await this.addMessage(chatId, userId, 'assistant', aiResponse);

        return {
            userMessage,
            assistantMessage,
        };
    }

    /**
     * Delete a chat
     */
    static async deleteChat(chatId: string, userId: string) {
        const chat = await prisma.aiChat.findUnique({
            where: { id: chatId },
        });

        if (!chat) {
            throw ApiError.notFound('Chat not found');
        }

        if (chat.userId !== userId) {
            throw ApiError.forbidden('You do not have access to this chat');
        }

        await prisma.aiChat.delete({
            where: { id: chatId },
        });

        return { success: true };
    }

    /**
     * Update chat title
     */
    static async updateChatTitle(chatId: string, userId: string, title: string) {
        const chat = await prisma.aiChat.findUnique({
            where: { id: chatId },
        });

        if (!chat) {
            throw ApiError.notFound('Chat not found');
        }

        if (chat.userId !== userId) {
            throw ApiError.forbidden('You do not have access to this chat');
        }

        const updated = await prisma.aiChat.update({
            where: { id: chatId },
            data: { title },
        });

        return {
            id: updated.id,
            title: updated.title,
            updatedAt: updated.updatedAt,
        };
    }
}

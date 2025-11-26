import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { JwtPayload } from '../middleware/auth.js';
import { ChatLog } from '../models/ChatLog.js';
import { SilenceEvent } from '../models/SilenceEvent.js';
import prisma from '../config/database.js';

// Store silence timers per room
const silenceTimers = new Map<string, NodeJS.Timeout>();
const SILENCE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// Store online users per room
const roomUsers = new Map<string, Map<string, { odId: string; userName: string; socketId: string }>>();

// Intervention messages pool
const INTERVENTION_MESSAGES = [
    "Sepertinya diskusi sudah agak sepi. Ada yang ingin berbagi pendapat atau pertanyaan?",
    "Tim, sudah beberapa saat tidak ada aktivitas. Apakah ada kesulitan yang bisa saya bantu?",
    "Bagaimana progress diskusi kalian? Jangan ragu untuk bertanya jika ada yang kurang jelas.",
    "Halo! Apakah kalian sudah menemukan solusi? Saya siap membantu jika diperlukan.",
    "Tim, mari kita lanjutkan diskusi. Apa langkah selanjutnya yang ingin kalian ambil?",
];

interface AuthenticatedSocket extends Socket {
    user?: JwtPayload;
    currentRoom?: string; // Track current room for cleanup
}

let io: Server;

export function initSocketIO(server: HttpServer): Server {
    const allowedOrigins = [
        process.env.CLIENT_URL || 'http://localhost:8080',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:8000',
        'http://127.0.0.1:8000',
    ];

    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling'],
    });

    // Authentication middleware
    io.use(async (socket: AuthenticatedSocket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            
            logger.debug(`Socket auth attempt - token present: ${!!token}`);

            if (!token) {
                logger.warn('Socket connection rejected: No token provided');
                return next(new Error('Authentication required'));
            }

            const secret = process.env.JWT_SECRET;
            if (!secret) {
                logger.error('Socket auth failed: JWT_SECRET not configured');
                return next(new Error('Server configuration error'));
            }

            const decoded = jwt.verify(token as string, secret) as JwtPayload;
            socket.user = decoded;
            
            logger.debug(`Socket auth success for user: ${decoded.email}`);

            next();
        } catch (error) {
            logger.error('Socket auth error:', error);
            next(new Error('Invalid token'));
        }
    });

    // Connection handler
    io.on('connection', (socket: AuthenticatedSocket) => {
        logger.info(`User connected: ${socket.user?.email} (${socket.id})`);

        // Join room (by chatSpace)
        socket.on('join_room', async (data: { courseId: string; groupId: string; chatSpaceId: string }) => {
            try {
                const { courseId, groupId, chatSpaceId } = data;

                if (!socket.user) {
                    socket.emit('error', { message: 'Not authenticated' });
                    return;
                }

                // Verify user has access to the group
                const hasAccess = await verifyGroupAccess(socket.user.userId, socket.user.role, groupId, courseId);

                if (!hasAccess) {
                    socket.emit('error', { message: 'Access denied to this group' });
                    return;
                }

                // Verify chat space belongs to the group
                const chatSpace = await prisma.chatSpace.findFirst({
                    where: { id: chatSpaceId, groupId },
                });

                if (!chatSpace) {
                    socket.emit('error', { message: 'Chat space not found' });
                    return;
                }

                // Use chatSpaceId as roomId for message separation per session
                const roomId = chatSpaceId;
                socket.join(roomId);
                socket.currentRoom = roomId; // Track for disconnect cleanup

                // Load chat history from MongoDB for this specific chat space
                const chatHistory = await ChatLog.find({ 
                    chatSpaceId,
                    isDeleted: { $ne: true }
                })
                    .sort({ createdAt: 1 })
                    .limit(100)
                    .lean();

                // If this is a fresh chat space (no messages yet), send welcome message with goals
                if (chatHistory.length === 0) {
                    // Get goals for this chat space
                    const goals = await prisma.learningGoal.findMany({
                        where: { chatSpaceId },
                        select: { content: true },
                    });

                    // Create welcome message content
                    let welcomeContent = `🎯 **Selamat datang di sesi diskusi "${chatSpace.name}"!**\n\n`;
                    
                    if (goals.length > 0) {
                        welcomeContent += `📚 **Tujuan Pembelajaran:**\n`;
                        goals.forEach((goal, index) => {
                            welcomeContent += `${index + 1}. ${goal.content}\n`;
                        });
                        welcomeContent += `\nSelamat berdiskusi! Fokus pada tujuan di atas dan bantu satu sama lain untuk memahami materi. 💪`;
                    } else {
                        welcomeContent += `Belum ada tujuan pembelajaran yang ditetapkan untuk sesi ini.\nSilakan mulai berdiskusi dengan anggota kelompok Anda!`;
                    }

                    // Save welcome message to MongoDB
                    const welcomeMessage = new ChatLog({
                        courseId,
                        groupId,
                        chatSpaceId,
                        senderId: 'system',
                        senderName: 'CoRegula',
                        senderType: 'system',
                        content: welcomeContent,
                        isIntervention: false,
                    });
                    await welcomeMessage.save();

                    // Add welcome message to chat history for sending
                    chatHistory.push({
                        _id: welcomeMessage._id,
                        courseId,
                        groupId,
                        chatSpaceId,
                        senderId: 'system',
                        senderName: 'CoRegula',
                        senderType: 'system' as const,
                        content: welcomeContent,
                        isIntervention: false,
                        createdAt: welcomeMessage.createdAt,
                        updatedAt: welcomeMessage.updatedAt,
                    });
                }

                // Send chat history to the user
                const historyMessages = chatHistory.map((msg) => ({
                    id: msg._id?.toString(),
                    senderId: msg.senderId,
                    senderName: msg.senderName,
                    senderType: msg.senderType,
                    content: msg.content,
                    isIntervention: msg.isIntervention,
                    replyTo: msg.replyTo ? {
                        messageId: msg.replyTo.messageId,
                        senderId: msg.replyTo.senderId,
                        senderName: msg.replyTo.senderName,
                        content: msg.replyTo.content,
                    } : undefined,
                    attachments: msg.attachments || [],
                    mentions: msg.mentions || [],
                    createdAt: msg.createdAt.toISOString(),
                }));

                socket.emit('chat_history', { messages: historyMessages });

                // Notify room about new user joining
                socket.to(roomId).emit('user_joined', {
                    userId: socket.user.userId,
                    userName: socket.user.email.split('@')[0],
                });

                // Track user in room
                if (!roomUsers.has(roomId)) {
                    roomUsers.set(roomId, new Map());
                }
                roomUsers.get(roomId)!.set(socket.user.userId, {
                    odId: socket.user.userId,
                    userName: socket.user.email.split('@')[0],
                    socketId: socket.id,
                });

                // Send current online users list to the joining user
                const onlineUsers = Array.from(roomUsers.get(roomId)!.values()).map(u => ({
                    odId: u.odId,
                    userName: u.userName,
                }));
                socket.emit('online_users', { users: onlineUsers });

                // Send room joined confirmation
                socket.emit('room_joined', { roomId, courseId, groupId, chatSpaceId });

                // Start silence timer if not exists
                startSilenceTimer(roomId, courseId, groupId, chatSpaceId);

                logger.info(`User ${socket.user.email} joined room ${roomId}`);
            } catch (error) {
                logger.error('Join room error:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        // Send message (with optional reply, attachments, and mentions)
        socket.on('send_message', async (data: { 
            roomId: string; 
            content: string;
            courseId: string;
            groupId: string;
            replyTo?: {
                messageId: string;
                senderId: string;
                senderName: string;
                content: string;
            };
            attachments?: Array<{
                id: string;
                name: string;
                type: string;
                size: number;
                url: string;
                previewUrl?: string;
            }>;
            mentions?: string[];
        }) => {
            try {
                const { roomId, content, courseId, groupId, replyTo, attachments, mentions } = data;

                if (!socket.user || (!content.trim() && (!attachments || attachments.length === 0))) {
                    return;
                }

                // roomId is chatSpaceId
                const chatSpaceId = roomId;

                const chatSpaceRecord = await prisma.chatSpace.findUnique({
                    where: { id: chatSpaceId },
                    select: { closedAt: true },
                });

                if (!chatSpaceRecord) {
                    socket.emit('error', { message: 'Chat space not found' });
                    return;
                }

                if (chatSpaceRecord.closedAt) {
                    socket.emit('session_closed', {
                        chatSpaceId,
                        closedAt: chatSpaceRecord.closedAt.toISOString(),
                        message: 'Sesi diskusi ini telah ditutup.',
                    });
                    return;
                }

                // Get user details
                const user = await prisma.user.findUnique({
                    where: { id: socket.user.userId },
                    select: { id: true, name: true, role: true },
                });

                if (!user) {
                    socket.emit('error', { message: 'User not found' });
                    return;
                }

                // Save message to MongoDB with chatSpaceId
                const chatLog = new ChatLog({
                    courseId,
                    groupId,
                    chatSpaceId,
                    senderId: user.id,
                    senderName: user.name,
                    senderType: user.role as 'student' | 'lecturer',
                    content: content.trim(),
                    isIntervention: false,
                    replyTo: replyTo ? {
                        messageId: replyTo.messageId,
                        senderId: replyTo.senderId,
                        senderName: replyTo.senderName,
                        content: replyTo.content.substring(0, 100), // Limit reply preview
                    } : undefined,
                    attachments: attachments || [],
                    mentions: mentions || [],
                });
                await chatLog.save();

                // Broadcast message to room
                const message = {
                    id: chatLog._id?.toString(),
                    senderId: user.id,
                    senderName: user.name,
                    senderType: user.role,
                    content: content.trim(),
                    replyTo: chatLog.replyTo,
                    attachments: chatLog.attachments,
                    mentions: chatLog.mentions,
                    createdAt: chatLog.createdAt.toISOString(),
                };

                io.to(roomId).emit('receive_message', message);

                // Reset silence timer
                resetSilenceTimer(roomId, courseId, groupId, chatSpaceId);

                // Check for @AI mention
                if (content.toLowerCase().includes('@ai')) {
                    handleAIQuestion(roomId, courseId, groupId, chatSpaceId, content, user.name);
                }

                logger.debug(`Message in ${roomId} from ${user.name}: ${content.substring(0, 50)}...`);
            } catch (error) {
                logger.error('Send message error:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // Delete message (only own messages)
        socket.on('delete_message', async (data: { roomId: string; messageId: string }) => {
            try {
                const { roomId, messageId } = data;

                if (!socket.user) {
                    socket.emit('error', { message: 'Not authenticated' });
                    return;
                }

                // Find the message
                const message = await ChatLog.findById(messageId);

                if (!message) {
                    socket.emit('error', { message: 'Message not found' });
                    return;
                }

                // Check ownership - only allow deleting own messages
                if (message.senderId !== socket.user.userId) {
                    socket.emit('error', { message: 'You can only delete your own messages' });
                    return;
                }

                // Soft delete the message
                message.isDeleted = true;
                await message.save();

                // Broadcast deletion to room
                io.to(roomId).emit('message_deleted', { messageId });

                logger.info(`Message ${messageId} deleted by ${socket.user.email}`);
            } catch (error) {
                logger.error('Delete message error:', error);
                socket.emit('error', { message: 'Failed to delete message' });
            }
        });

        // Typing indicator
        socket.on('typing', (data: { roomId: string; isTyping: boolean }) => {
            if (!socket.user) return;

            socket.to(data.roomId).emit('user_typing', {
                userId: socket.user.userId,
                userName: socket.user.email.split('@')[0],
                isTyping: data.isTyping,
            });
        });

        // Leave room
        socket.on('leave_room', (roomId: string) => {
            // Clear typing indicator when leaving
            if (socket.user) {
                socket.to(roomId).emit('user_typing', {
                    userId: socket.user.userId,
                    userName: socket.user.email.split('@')[0],
                    isTyping: false,
                });

                // Remove user from room tracking
                if (roomUsers.has(roomId)) {
                    roomUsers.get(roomId)!.delete(socket.user.userId);
                    // Notify others that user left
                    socket.to(roomId).emit('user_left', { userId: socket.user.userId });
                    // Clean up empty room
                    if (roomUsers.get(roomId)!.size === 0) {
                        roomUsers.delete(roomId);
                    }
                }
            }
            socket.leave(roomId);
            socket.currentRoom = undefined;
            logger.info(`User ${socket.user?.email} left room ${roomId}`);
        });

        // Disconnect
        socket.on('disconnect', () => {
            // Clear typing indicator and remove from room tracking
            if (socket.user && socket.currentRoom) {
                socket.to(socket.currentRoom).emit('user_typing', {
                    userId: socket.user.userId,
                    userName: socket.user.email.split('@')[0],
                    isTyping: false,
                });

                // Remove user from room tracking
                if (roomUsers.has(socket.currentRoom)) {
                    roomUsers.get(socket.currentRoom)!.delete(socket.user.userId);
                    // Notify others that user left
                    socket.to(socket.currentRoom).emit('user_left', { userId: socket.user.userId });
                    // Clean up empty room
                    if (roomUsers.get(socket.currentRoom)!.size === 0) {
                        roomUsers.delete(socket.currentRoom);
                    }
                }
            }
            logger.info(`User disconnected: ${socket.user?.email} (${socket.id})`);
        });
    });

    logger.info('✅ Socket.IO initialized');
    return io;
}

/**
 * Verify user has access to a group
 */
async function verifyGroupAccess(
    userId: string,
    role: string,
    groupId: string,
    courseId: string
): Promise<boolean> {
    if (role === 'lecturer') {
        // Lecturer must own the course
        const course = await prisma.course.findFirst({
            where: { id: courseId, ownerId: userId },
        });
        return !!course;
    } else {
        // Student must be a member of the group
        const membership = await prisma.groupMember.findUnique({
            where: {
                groupId_userId: { groupId, userId },
            },
        });
        return !!membership;
    }
}

/**
 * Start silence timer for a room
 */
function startSilenceTimer(roomId: string, courseId: string, groupId: string, chatSpaceId: string): void {
    if (silenceTimers.has(roomId)) return;

    const timer = setTimeout(() => {
        triggerIntervention(roomId, courseId, groupId, chatSpaceId);
    }, SILENCE_TIMEOUT_MS);

    silenceTimers.set(roomId, timer);
}

/**
 * Reset silence timer for a room
 */
function resetSilenceTimer(roomId: string, courseId: string, groupId: string, chatSpaceId: string): void {
    const existingTimer = silenceTimers.get(roomId);
    if (existingTimer) {
        clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
        triggerIntervention(roomId, courseId, groupId, chatSpaceId);
    }, SILENCE_TIMEOUT_MS);

    silenceTimers.set(roomId, timer);
}

/**
 * Trigger bot intervention after silence
 */
async function triggerIntervention(roomId: string, courseId: string, groupId: string, chatSpaceId: string): Promise<void> {
    try {
        // Log silence event
        const silenceEvent = new SilenceEvent({
            courseId,
            groupId,
            chatSpaceId,
            silenceDuration: SILENCE_TIMEOUT_MS / 1000,
            interventionSent: true,
        });
        await silenceEvent.save();

        // Pick random intervention message
        const message = INTERVENTION_MESSAGES[Math.floor(Math.random() * INTERVENTION_MESSAGES.length)];

        // Save bot message
        const chatLog = new ChatLog({
            courseId,
            groupId,
            chatSpaceId,
            senderId: 'bot',
            senderName: 'CoRegula Bot',
            senderType: 'bot',
            content: message,
            isIntervention: true,
        });
        await chatLog.save();

        // Broadcast to room
        io.to(roomId).emit('receive_message', {
            id: chatLog._id?.toString(),
            senderId: 'bot',
            senderName: 'CoRegula Bot',
            senderType: 'bot',
            content: message,
            isIntervention: true,
            createdAt: chatLog.createdAt.toISOString(),
        });

        // Remove timer (don't restart until human responds)
        silenceTimers.delete(roomId);

        logger.info(`Intervention sent to room ${roomId}`);
    } catch (error) {
        logger.error('Intervention error:', error);
    }
}

/**
 * Handle AI question (when user mentions @AI)
 */
async function handleAIQuestion(
    roomId: string,
    courseId: string,
    groupId: string,
    chatSpaceId: string,
    question: string,
    userName: string
): Promise<void> {
    const aiEngineUrl = process.env.AI_ENGINE_URL;

    // Show typing indicator
    io.to(roomId).emit('ai_typing', { isTyping: true });

    try {
        let response: string;

        if (!aiEngineUrl) {
            response = "Maaf, AI Assistant sedang tidak tersedia saat ini. Silakan coba lagi nanti.";
        } else {
            // Call AI Engine
            const result = await fetch(`${aiEngineUrl}/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: question.replace(/@ai/gi, '').trim(),
                    course_id: courseId,
                    user_name: userName,
                }),
            });

            if (result.ok) {
                const data = await result.json() as { answer?: string };
                response = data.answer || "Maaf, saya tidak bisa menemukan jawaban untuk pertanyaan tersebut.";
            } else {
                response = "Maaf, terjadi kesalahan saat memproses pertanyaan. Silakan coba lagi.";
            }
        }

        // Save AI response with chatSpaceId
        const chatLog = new ChatLog({
            courseId,
            groupId,
            chatSpaceId,
            senderId: 'ai',
            senderName: 'AI Assistant',
            senderType: 'ai',
            content: response,
            isIntervention: false,
        });
        await chatLog.save();

        // Send response
        io.to(roomId).emit('receive_message', {
            id: chatLog._id?.toString(),
            senderId: 'ai',
            senderName: 'AI Assistant',
            senderType: 'ai',
            content: response,
            createdAt: chatLog.createdAt.toISOString(),
        });
    } catch (error) {
        logger.error('AI question error:', error);

        io.to(roomId).emit('receive_message', {
            senderId: 'ai',
            senderName: 'AI Assistant',
            senderType: 'ai',
            content: "Maaf, terjadi kesalahan teknis. Silakan coba lagi.",
            createdAt: new Date().toISOString(),
        });
    } finally {
        io.to(roomId).emit('ai_typing', { isTyping: false });
    }
}

/**
 * Get Socket.IO instance
 */
export function getIO(): Server {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
}

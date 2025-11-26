import prisma from '../config/database.js';
import { ApiError } from '../middleware/errorHandler.js';
import { CreateGoalInput } from '../validators/goal.validator.js';
import { validateGoalContent } from '../utils/helpers.js';
import { GroupService } from './group.service.js';

export class GoalService {
    /**
     * Submit a learning goal (student only) - now per ChatSpace
     */
    static async createGoal(data: CreateGoalInput, userId: string) {
        // Extract chatSpaceId from snake_case input
        const chatSpaceId = data.chat_space_id;
        
        // Get chat space with group info
        const chatSpace = await prisma.chatSpace.findUnique({
            where: { id: chatSpaceId },
            include: {
                group: {
                    select: { id: true, name: true },
                },
            },
        });

        if (!chatSpace) {
            throw ApiError.notFound('Chat space not found');
        }

        // Verify user is member of the group
        const isMember = await GroupService.isGroupMember(chatSpace.groupId, userId);

        if (!isMember) {
            throw ApiError.forbidden('You are not a member of this group');
        }

        // Validate goal content with Bloom's Taxonomy verbs
        const validation = validateGoalContent(data.content);

        if (!validation.isValid) {
            throw ApiError.badRequest(validation.message);
        }

        // Create goal
        const goal = await prisma.learningGoal.create({
            data: {
                content: data.content,
                chatSpaceId,
                userId,
                isValidated: true, // Server-side validation passed
            },
            include: {
                user: {
                    select: { id: true, name: true },
                },
                chatSpace: {
                    select: { 
                        id: true, 
                        name: true,
                        group: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
        });

        return {
            id: goal.id,
            content: goal.content,
            isValidated: goal.isValidated,
            chatSpace: goal.chatSpace,
            createdBy: goal.user,
            createdAt: goal.createdAt,
        };
    }

    /**
     * Get goals for a chat space
     */
    static async getChatSpaceGoals(chatSpaceId: string, userId: string, role: string) {
        // Get chat space with group and course info
        const chatSpace = await prisma.chatSpace.findUnique({
            where: { id: chatSpaceId },
            include: {
                group: {
                    include: {
                        course: {
                            select: { ownerId: true },
                        },
                    },
                },
            },
        });

        if (!chatSpace) {
            throw ApiError.notFound('Chat space not found');
        }

        // Check access
        if (role === 'lecturer') {
            if (chatSpace.group.course.ownerId !== userId) {
                throw ApiError.forbidden('You do not own this course');
            }
        } else {
            const isMember = await GroupService.isGroupMember(chatSpace.groupId, userId);
            if (!isMember) {
                throw ApiError.forbidden('You are not a member of this group');
            }
        }

        const goals = await prisma.learningGoal.findMany({
            where: { chatSpaceId },
            include: {
                user: {
                    select: { id: true, name: true },
                },
                _count: {
                    select: { reflections: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return goals.map((goal: typeof goals[number]) => ({
            id: goal.id,
            content: goal.content,
            isValidated: goal.isValidated,
            createdBy: goal.user,
            reflectionsCount: goal._count.reflections,
            createdAt: goal.createdAt,
        }));
    }

    /**
     * Get user's goals across all chat spaces
     */
    static async getMyGoals(userId: string) {
        const goals = await prisma.learningGoal.findMany({
            where: { userId },
            include: {
                chatSpace: {
                    select: {
                        id: true,
                        name: true,
                        group: {
                            select: {
                                id: true,
                                name: true,
                                course: {
                                    select: { id: true, code: true, name: true },
                                },
                            },
                        },
                    },
                },
                _count: {
                    select: { reflections: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return goals.map((goal: typeof goals[number]) => ({
            id: goal.id,
            content: goal.content,
            isValidated: goal.isValidated,
            chatSpace: goal.chatSpace,
            reflectionsCount: goal._count.reflections,
            createdAt: goal.createdAt,
        }));
    }

    /**
     * Get goal details
     */
    static async getGoalDetails(goalId: string, userId: string, role: string) {
        const goal = await prisma.learningGoal.findUnique({
            where: { id: goalId },
            include: {
                user: {
                    select: { id: true, name: true },
                },
                chatSpace: {
                    include: {
                        group: {
                            include: {
                                course: {
                                    select: { id: true, code: true, name: true, ownerId: true },
                                },
                            },
                        },
                    },
                },
                reflections: {
                    include: {
                        user: {
                            select: { id: true, name: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!goal) {
            throw ApiError.notFound('Goal not found');
        }

        // Check access
        if (role === 'lecturer') {
            if (goal.chatSpace.group.course.ownerId !== userId) {
                throw ApiError.forbidden('You do not own this course');
            }
        } else {
            const isMember = await GroupService.isGroupMember(goal.chatSpace.groupId, userId);
            if (!isMember && goal.userId !== userId) {
                throw ApiError.forbidden('You do not have access to this goal');
            }
        }

        return {
            id: goal.id,
            content: goal.content,
            isValidated: goal.isValidated,
            createdBy: goal.user,
            chatSpace: {
                id: goal.chatSpace.id,
                name: goal.chatSpace.name,
                group: {
                    id: goal.chatSpace.group.id,
                    name: goal.chatSpace.group.name,
                    course: goal.chatSpace.group.course,
                },
            },
            reflections: goal.reflections.map((r: typeof goal.reflections[number]) => ({
                id: r.id,
                content: r.content,
                createdBy: r.user,
                createdAt: r.createdAt,
            })),
            createdAt: goal.createdAt,
        };
    }

    /**
     * Get user's goal in a specific chat space
     */
    static async getUserGoalInChatSpace(chatSpaceId: string, userId: string) {
        const goal = await prisma.learningGoal.findFirst({
            where: {
                chatSpaceId,
                userId,
            },
            include: {
                user: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!goal) {
            return null;
        }

        return {
            id: goal.id,
            content: goal.content,
            isValidated: goal.isValidated,
            createdBy: goal.user,
            createdAt: goal.createdAt,
        };
    }
}

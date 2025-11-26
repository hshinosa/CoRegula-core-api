import mongoose, { Schema, Document } from 'mongoose';

export interface IReplyTo {
    messageId: string;
    senderId: string;
    senderName: string;
    content: string;
}

export interface IAttachment {
    id: string;
    name: string;
    type: string;
    size: number;
    url: string;
    previewUrl?: string;
}

export interface IChatLog extends Document {
    courseId: string;
    groupId: string;
    chatSpaceId: string;
    senderId: string;
    senderName: string;
    senderType: 'student' | 'lecturer' | 'ai' | 'bot' | 'system';
    content: string;
    isIntervention: boolean;
    isDeleted: boolean;
    replyTo?: IReplyTo;
    attachments: IAttachment[];
    mentions: string[];
    createdAt: Date;
}

const ReplyToSchema = new Schema<IReplyTo>(
    {
        messageId: { type: String, required: true },
        senderId: { type: String, required: true },
        senderName: { type: String, required: true },
        content: { type: String, required: true },
    },
    { _id: false }
);

const AttachmentSchema = new Schema<IAttachment>(
    {
        id: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, required: true },
        size: { type: Number, required: true },
        url: { type: String, required: true },
        previewUrl: { type: String, required: false },
    },
    { _id: false }
);

const ChatLogSchema = new Schema<IChatLog>(
    {
        courseId: { type: String, required: true, index: true },
        groupId: { type: String, required: true, index: true },
        chatSpaceId: { type: String, required: true, index: true },
        senderId: { type: String, required: true },
        senderName: { type: String, required: true },
        senderType: {
            type: String,
            enum: ['student', 'lecturer', 'ai', 'bot', 'system'],
            default: 'student',
        },
        content: { type: String, default: '' },
        isIntervention: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
        replyTo: { type: ReplyToSchema, required: false },
        attachments: { type: [AttachmentSchema], default: [] },
        mentions: { type: [String], default: [] },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Compound index for efficient queries - by chatSpaceId for per-session chat
ChatLogSchema.index({ chatSpaceId: 1, createdAt: -1 });
ChatLogSchema.index({ courseId: 1, groupId: 1, createdAt: -1 });

export const ChatLog = mongoose.model<IChatLog>('ChatLog', ChatLogSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
    courseId: string;
    groupId?: string;
    userId: string;
    userName: string;
    activityType: 'goal_set' | 'reflection_written' | 'message_sent' | 'file_uploaded' | 'course_joined' | 'group_joined';
    metadata?: Record<string, unknown>;
    createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
    {
        courseId: { type: String, required: true, index: true },
        groupId: { type: String, index: true },
        userId: { type: String, required: true, index: true },
        userName: { type: String, required: true },
        activityType: {
            type: String,
            enum: ['goal_set', 'reflection_written', 'message_sent', 'file_uploaded', 'course_joined', 'group_joined'],
            required: true,
        },
        metadata: { type: Schema.Types.Mixed },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

ActivityLogSchema.index({ courseId: 1, createdAt: -1 });
ActivityLogSchema.index({ groupId: 1, createdAt: -1 });

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);

import { z } from 'zod';

export const createReflectionSchema = z.object({
    goalId: z.string().uuid('Invalid goal ID'),
    content: z
        .string()
        .min(20, 'Reflection must be at least 20 characters')
        .max(2000, 'Reflection must be less than 2000 characters')
        .trim(),
});

export type CreateReflectionInput = z.infer<typeof createReflectionSchema>;

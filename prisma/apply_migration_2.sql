-- Migration 2: 20251126213400_add_chatspace_closed_reflection

-- DropForeignKey
ALTER TABLE "learning_goals" DROP CONSTRAINT IF EXISTS "learning_goals_group_id_fkey";
ALTER TABLE "reflections" DROP CONSTRAINT IF EXISTS "reflections_goal_id_fkey";

-- AlterTable groups
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "created_by" TEXT NOT NULL DEFAULT '';
ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "join_code" TEXT NOT NULL DEFAULT '';

-- AlterTable learning_goals
ALTER TABLE "learning_goals" DROP COLUMN IF EXISTS "group_id";
ALTER TABLE "learning_goals" ADD COLUMN IF NOT EXISTS "chat_space_id" TEXT NOT NULL DEFAULT '';

-- AlterTable reflections
ALTER TABLE "reflections" ADD COLUMN IF NOT EXISTS "chat_space_id" TEXT;
ALTER TABLE "reflections" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'session';
ALTER TABLE "reflections" ALTER COLUMN "goal_id" DROP NOT NULL;

-- CreateTable chat_spaces
CREATE TABLE IF NOT EXISTS "chat_spaces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "closed_by" TEXT,
    "created_by" TEXT NOT NULL,
    "group_id" TEXT NOT NULL
);

-- CreateTable chat_messages
CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "sender_type" TEXT NOT NULL,
    "is_intervention" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reply_to_id" TEXT,
    "chat_space_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL
);

-- CreateTable ai_chats
CREATE TABLE IF NOT EXISTS "ai_chats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'Chat Baru',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL
);

-- CreateTable ai_chat_messages
CREATE TABLE IF NOT EXISTS "ai_chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chat_id" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "groups_join_code_key" ON "groups"("join_code");

-- AddForeignKey
ALTER TABLE "chat_spaces" DROP CONSTRAINT IF EXISTS "chat_spaces_group_id_fkey";
ALTER TABLE "chat_spaces" ADD CONSTRAINT "chat_spaces_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_reply_to_id_fkey";
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_chat_space_id_fkey";
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_space_id_fkey" FOREIGN KEY ("chat_space_id") REFERENCES "chat_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages" DROP CONSTRAINT IF EXISTS "chat_messages_sender_id_fkey";
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learning_goals" DROP CONSTRAINT IF EXISTS "learning_goals_chat_space_id_fkey";
ALTER TABLE "learning_goals" ADD CONSTRAINT "learning_goals_chat_space_id_fkey" FOREIGN KEY ("chat_space_id") REFERENCES "chat_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reflections" DROP CONSTRAINT IF EXISTS "reflections_goal_id_fkey";
ALTER TABLE "reflections" ADD CONSTRAINT "reflections_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "learning_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reflections" DROP CONSTRAINT IF EXISTS "reflections_chat_space_id_fkey";
ALTER TABLE "reflections" ADD CONSTRAINT "reflections_chat_space_id_fkey" FOREIGN KEY ("chat_space_id") REFERENCES "chat_spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_chats" DROP CONSTRAINT IF EXISTS "ai_chats_user_id_fkey";
ALTER TABLE "ai_chats" ADD CONSTRAINT "ai_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_chat_messages" DROP CONSTRAINT IF EXISTS "ai_chat_messages_chat_id_fkey";
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "ai_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

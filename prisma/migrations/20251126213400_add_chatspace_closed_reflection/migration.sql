/*
  Warnings:

  - You are about to drop the column `group_id` on the `learning_goals` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[join_code]` on the table `groups` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `created_by` to the `groups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `join_code` to the `groups` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chat_space_id` to the `learning_goals` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "learning_goals" DROP CONSTRAINT "learning_goals_group_id_fkey";

-- DropForeignKey
ALTER TABLE "reflections" DROP CONSTRAINT "reflections_goal_id_fkey";

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "created_by" TEXT NOT NULL,
ADD COLUMN     "join_code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "learning_goals" DROP COLUMN "group_id",
ADD COLUMN     "chat_space_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "reflections" ADD COLUMN     "chat_space_id" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'session',
ALTER COLUMN "goal_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "chat_spaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),
    "closed_by" TEXT,
    "created_by" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,

    CONSTRAINT "chat_spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sender_type" TEXT NOT NULL,
    "is_intervention" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reply_to_id" TEXT,
    "chat_space_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chats" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Chat Baru',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "ai_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_chat_messages" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chat_id" TEXT NOT NULL,

    CONSTRAINT "ai_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "groups_join_code_key" ON "groups"("join_code");

-- AddForeignKey
ALTER TABLE "chat_spaces" ADD CONSTRAINT "chat_spaces_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_space_id_fkey" FOREIGN KEY ("chat_space_id") REFERENCES "chat_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_goals" ADD CONSTRAINT "learning_goals_chat_space_id_fkey" FOREIGN KEY ("chat_space_id") REFERENCES "chat_spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflections" ADD CONSTRAINT "reflections_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "learning_goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reflections" ADD CONSTRAINT "reflections_chat_space_id_fkey" FOREIGN KEY ("chat_space_id") REFERENCES "chat_spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chats" ADD CONSTRAINT "ai_chats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_chat_messages" ADD CONSTRAINT "ai_chat_messages_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "ai_chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

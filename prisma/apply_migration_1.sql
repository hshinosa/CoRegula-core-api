-- Migration 1: 20251125144046_coregula

-- CreateEnum - SKIP (sudah ada)
-- CREATE TYPE "UserRole" AS ENUM ('student', 'lecturer', 'admin');

-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VectorStatus') THEN
        CREATE TYPE "VectorStatus" AS ENUM ('pending', 'processing', 'ready', 'failed', 'skipped');
    END IF;
END $$;

-- CreateTable users
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'student',
    "google_id" TEXT UNIQUE,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateTable courses
CREATE TABLE IF NOT EXISTS "courses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "join_code" TEXT NOT NULL UNIQUE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "owner_id" TEXT NOT NULL
);

-- CreateTable course_students
CREATE TABLE IF NOT EXISTS "course_students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    UNIQUE("course_id", "user_id")
);

-- CreateTable groups
CREATE TABLE IF NOT EXISTS "groups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "course_id" TEXT NOT NULL
);

-- CreateTable group_members
CREATE TABLE IF NOT EXISTS "group_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    UNIQUE("group_id", "user_id")
);

-- CreateTable learning_goals
CREATE TABLE IF NOT EXISTS "learning_goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "is_validated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL
);

-- CreateTable reflections
CREATE TABLE IF NOT EXISTS "reflections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "goal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL
);

-- CreateTable knowledge_bases
CREATE TABLE IF NOT EXISTS "knowledge_bases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "vector_status" "VectorStatus" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "course_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL
);

-- AddForeignKey
ALTER TABLE "courses" DROP CONSTRAINT IF EXISTS "courses_owner_id_fkey";
ALTER TABLE "courses" ADD CONSTRAINT "courses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_students" DROP CONSTRAINT IF EXISTS "course_students_course_id_fkey";
ALTER TABLE "course_students" ADD CONSTRAINT "course_students_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_students" DROP CONSTRAINT IF EXISTS "course_students_user_id_fkey";
ALTER TABLE "course_students" ADD CONSTRAINT "course_students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "groups" DROP CONSTRAINT IF EXISTS "groups_course_id_fkey";
ALTER TABLE "groups" ADD CONSTRAINT "groups_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "group_members" DROP CONSTRAINT IF EXISTS "group_members_group_id_fkey";
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "group_members" DROP CONSTRAINT IF EXISTS "group_members_user_id_fkey";
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learning_goals" DROP CONSTRAINT IF EXISTS "learning_goals_group_id_fkey";
ALTER TABLE "learning_goals" ADD CONSTRAINT "learning_goals_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "learning_goals" DROP CONSTRAINT IF EXISTS "learning_goals_user_id_fkey";
ALTER TABLE "learning_goals" ADD CONSTRAINT "learning_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reflections" DROP CONSTRAINT IF EXISTS "reflections_goal_id_fkey";
ALTER TABLE "reflections" ADD CONSTRAINT "reflections_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "learning_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reflections" DROP CONSTRAINT IF EXISTS "reflections_user_id_fkey";
ALTER TABLE "reflections" ADD CONSTRAINT "reflections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_bases" DROP CONSTRAINT IF EXISTS "knowledge_bases_course_id_fkey";
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_bases" DROP CONSTRAINT IF EXISTS "knowledge_bases_uploaded_by_fkey";
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

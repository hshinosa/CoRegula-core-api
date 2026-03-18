-- ============================================================================
-- FIX: Restore Missing users.role Column
-- ============================================================================
--
-- PROBLEM:
--   The column `users.role` does not exist in the current database.
--   Error: PrismaClientKnownRequestError: P2022
--
-- CAUSE:
--   Database was reset but _prisma_migrations table still shows
--   migrations as applied, causing Prisma to skip running them.
--
-- SOLUTION:
--   Idempotent SQL to add the missing UserRole enum and role column.
--
-- USAGE:
--   npx prisma db execute --file prisma/fix_role_column.sql
--
-- AFTER RUNNING:
--   npx prisma generate
--
-- ============================================================================

-- Create UserRole enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        CREATE TYPE "UserRole" AS ENUM ('student', 'lecturer', 'admin');
        RAISE NOTICE 'Created UserRole enum';
    ELSE
        RAISE NOTICE 'UserRole enum already exists, skipping';
    END IF;
END $$;

-- Add role column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE "users"
        ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'student';
        RAISE NOTICE 'Added role column to users table';
    ELSE
        RAISE NOTICE 'role column already exists, skipping';
    END IF;
END $$;

-- Verify the fix
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

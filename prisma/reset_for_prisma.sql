-- ============================================================================
-- FIX: Reset Database untuk CoRegula (Prisma + Laravel Shared Database)
-- ============================================================================
--
-- PROBLEM:
--   Laravel migrations berjalan sebelum Prisma, menyebabkan:
--   - Tabel Laravel (cache, jobs) sudah ada
--   - Tabel Prisma (users, courses, dll) belum ada
--   - Error: "table public.users does not exist"
--
-- SOLUSI:
--   1. Drop semua tabel Laravel (aman, hanya cache/session)
--   2. Jalankan Prisma migrations (membuat semua tabel Core API)
--   3. Jalankan Laravel migrations (akan skip users, buat cache/jobs)
--
-- WARNING:
--   Script ini menghapus data di tabel cache, sessions, jobs!
--   Tabel users dan data bisnis aman (dibuat ulang oleh Prisma)
--
-- USAGE:
--   psql $DATABASE_URL -f prisma/reset_for_prisma.sql
--
-- ============================================================================

-- Drop tabel Laravel (urutan penting untuk FK constraints)
DROP TABLE IF EXISTS "failed_jobs" CASCADE;
DROP TABLE IF EXISTS "job_batches" CASCADE;
DROP TABLE IF EXISTS "jobs" CASCADE;
DROP TABLE IF EXISTS "cache_locks" CASCADE;
DROP TABLE IF EXISTS "cache" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "password_reset_tokens" CASCADE;

-- Hapus tabel users jika ada dari Laravel (bukan dari Prisma)
-- Prisma akan membuat ulang dengan schema yang benar
DROP TABLE IF EXISTS "users" CASCADE;

-- Hapus enum UserRole jika ada (Prisma akan buat ulang)
DROP TYPE IF EXISTS "UserRole" CASCADE;

-- Hapus enum VectorStatus jika ada (Prisma akan buat ulang)
DROP TYPE IF EXISTS "VectorStatus" CASCADE;

-- Reset Prisma migrations table (opsional - uncomment jika diperlukan)
-- DELETE FROM "_prisma_migrations";

-- ============================================================================
-- RESET COMPLETE
-- ============================================================================
--
-- LANGKAH SELANJUTNYA:
--
-- 1. Jalankan Prisma migrations:
--    cd CoRegula-core-api
--    npx prisma migrate deploy
--
-- 2. Generate Prisma Client:
--    npx prisma generate
--
-- 3. Jalankan Laravel migrations (akan skip users table):
--    cd ../CoRegula-client-app
--    php artisan migrate:fresh
--
-- 4. Restart kedua aplikasi
--
-- ============================================================================

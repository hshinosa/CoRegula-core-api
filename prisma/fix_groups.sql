-- Add missing columns to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS join_code VARCHAR(255);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS created_by VARCHAR(255);

-- Update existing rows with default values
UPDATE groups SET join_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)) WHERE join_code IS NULL;
UPDATE groups SET created_by = (SELECT owner_id FROM courses WHERE courses.id = groups.course_id) WHERE created_by IS NULL;

-- Make columns NOT NULL
ALTER TABLE groups ALTER COLUMN join_code SET NOT NULL;
ALTER TABLE groups ALTER COLUMN created_by SET NOT NULL;

-- Add unique constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groups_join_code_key') THEN
        ALTER TABLE groups ADD CONSTRAINT groups_join_code_key UNIQUE (join_code);
    END IF;
END $$;

-- Add chat_spaces table if not exists
CREATE TABLE IF NOT EXISTS chat_spaces (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    group_id VARCHAR(255) NOT NULL REFERENCES groups(id) ON DELETE CASCADE
);

-- Add chat_messages table if not exists
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    content TEXT NOT NULL,
    sender_type VARCHAR(50) NOT NULL,
    is_intervention BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    reply_to_id VARCHAR(255) REFERENCES chat_messages(id) ON DELETE SET NULL,
    chat_space_id VARCHAR(255) NOT NULL REFERENCES chat_spaces(id) ON DELETE CASCADE,
    sender_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Add ai_chats table if not exists
CREATE TABLE IF NOT EXISTS ai_chats (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title VARCHAR(255) DEFAULT 'Chat Baru',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Add ai_chat_messages table if not exists
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    role VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    chat_id VARCHAR(255) NOT NULL REFERENCES ai_chats(id) ON DELETE CASCADE
);

-- Migrate learning_goals from group_id to chat_space_id
-- First add the new column
ALTER TABLE learning_goals ADD COLUMN IF NOT EXISTS chat_space_id VARCHAR(255);

-- For existing goals, assign them to the default chat space of their group
UPDATE learning_goals lg
SET chat_space_id = (
    SELECT cs.id FROM chat_spaces cs 
    WHERE cs.group_id = lg.group_id AND cs.is_default = true
    LIMIT 1
)
WHERE lg.chat_space_id IS NULL AND lg.group_id IS NOT NULL;

-- If no default chat space exists, create one for each group that has goals
INSERT INTO chat_spaces (id, name, description, is_default, created_at, updated_at, created_by, group_id)
SELECT 
    gen_random_uuid()::text,
    'Umum',
    'Chat space default',
    true,
    NOW(),
    NOW(),
    g.created_by,
    g.id
FROM groups g
WHERE NOT EXISTS (SELECT 1 FROM chat_spaces cs WHERE cs.group_id = g.id AND cs.is_default = true);

-- Update goals again after creating default chat spaces
UPDATE learning_goals lg
SET chat_space_id = (
    SELECT cs.id FROM chat_spaces cs 
    WHERE cs.group_id = lg.group_id AND cs.is_default = true
    LIMIT 1
)
WHERE lg.chat_space_id IS NULL AND lg.group_id IS NOT NULL;

-- Add foreign key constraint for chat_space_id
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_goals_chat_space_id_fkey') THEN
        ALTER TABLE learning_goals 
        ADD CONSTRAINT learning_goals_chat_space_id_fkey 
        FOREIGN KEY (chat_space_id) REFERENCES chat_spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Drop old group_id column from learning_goals (optional - keep for now for safety)
-- ALTER TABLE learning_goals DROP COLUMN IF EXISTS group_id;

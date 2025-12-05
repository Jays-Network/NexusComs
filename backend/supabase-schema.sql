-- SecureChat Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  push_token TEXT,
  is_admin BOOLEAN DEFAULT false,
  location_tracking_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main Groups table
CREATE TABLE IF NOT EXISTS main_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subgroups table
CREATE TABLE IF NOT EXISTS subgroups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  main_group_id UUID REFERENCES main_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_template_locked BOOLEAN DEFAULT false,
  template_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Group Members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subgroup_id UUID REFERENCES subgroups(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, subgroup_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subgroup_id UUID REFERENCES subgroups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Messages table
CREATE TABLE IF NOT EXISTS emergency_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subgroup_id UUID REFERENCES subgroups(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency Acknowledgments table
CREATE TABLE IF NOT EXISTS emergency_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_message_id UUID REFERENCES emergency_messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(emergency_message_id, user_id)
);

-- User Locations table
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message Templates table
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  fields JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_subgroup ON messages(subgroup_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_messages_subgroup ON emergency_messages(subgroup_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_locations_user ON user_locations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_subgroup ON group_members(subgroup_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

-- Seed data: Create admin user and sample groups
-- Password for admin: admin123 (you should change this)
INSERT INTO users (username, password_hash, display_name, is_admin) VALUES
  ('admin', '$2b$10$vI/qH.9ELKjLg9zqKCZ3WOhGVrqF1yJKV8Dy8xDhPe7E5cKsJYceu', 'Administrator', true);

-- Create sample main groups
INSERT INTO main_groups (name, description) VALUES
  ('Operations', 'Operations and field teams'),
  ('Command', 'Command center and leadership'),
  ('Support', 'Support and logistics');

-- Create sample subgroups
INSERT INTO subgroups (main_group_id, name, description, is_template_locked)
SELECT
  mg.id,
  'General',
  'General discussion',
  false
FROM main_groups mg
WHERE mg.name = 'Operations';

INSERT INTO subgroups (main_group_id, name, description, is_template_locked)
SELECT
  mg.id,
  'Emergency Response',
  'Emergency response coordination',
  false
FROM main_groups mg
WHERE mg.name = 'Operations';

INSERT INTO subgroups (main_group_id, name, description, is_template_locked)
SELECT
  mg.id,
  'Status Reports',
  'Formal status reporting (template enforced)',
  true
FROM main_groups mg
WHERE mg.name = 'Command';

-- Add admin to all subgroups
INSERT INTO group_members (user_id, subgroup_id)
SELECT u.id, s.id
FROM users u
CROSS JOIN subgroups s
WHERE u.username = 'admin';

-- Add some demo users (password for all: demo123)
INSERT INTO users (username, password_hash, display_name, location_tracking_enabled) VALUES
  ('user1', '$2b$10$vI/qH.9ELKjLg9zqKCZ3WOhGVrqF1yJKV8Dy8xDhPe7E5cKsJYceu', 'Team Member 1', true),
  ('user2', '$2b$10$vI/qH.9ELKjLg9zqKCZ3WOhGVrqF1yJKV8Dy8xDhPe7E5cKsJYceu', 'Team Member 2', true);

-- Add demo users to Operations general subgroup
INSERT INTO group_members (user_id, subgroup_id)
SELECT u.id, s.id
FROM users u
CROSS JOIN subgroups s
WHERE u.username IN ('user1', 'user2')
  AND s.name = 'General';

-- Success message
SELECT 'Database schema created successfully! Admin credentials: admin/admin123' as status;

# Supabase Setup - Groups & Emergency Groups

## Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/
2. Open your project
3. Go to SQL Editor tab

## Step 2: Run These SQL Queries

### Query 1: Create Groups Table
```sql
CREATE TABLE IF NOT EXISTS groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_group_id BIGINT REFERENCES groups(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_created_by ON groups(created_by);
```

### Query 2: Create Group Members Table
```sql
CREATE TABLE IF NOT EXISTS group_members (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  added_by UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
```

### Query 3: Create Emergency Groups Table
```sql
CREATE TABLE IF NOT EXISTS emergency_groups (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  alert_protocol TEXT DEFAULT 'standard',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_groups_created_by ON emergency_groups(created_by);
```

### Query 4: Create Emergency Group Members Table
```sql
CREATE TABLE IF NOT EXISTS emergency_group_members (
  id BIGSERIAL PRIMARY KEY,
  emergency_group_id BIGINT NOT NULL REFERENCES emergency_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  added_by UUID NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(emergency_group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_emergency_group_members_group_id ON emergency_group_members(emergency_group_id);
CREATE INDEX IF NOT EXISTS idx_emergency_group_members_user_id ON emergency_group_members(user_id);
```

## Step 3: Enable RLS (Row Level Security) - Optional but Recommended
This ensures users can only see groups they're members of.

## Done!
Your backend API is now ready to:
- Create groups with member assignment
- Create emergency groups with member assignment  
- Sync all data to Stream Chat automatically
- Manage members in both Supabase and Stream

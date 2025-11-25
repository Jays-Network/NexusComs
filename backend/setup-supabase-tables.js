const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const queries = [
  `CREATE TABLE IF NOT EXISTS groups (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    parent_group_id BIGINT REFERENCES groups(id),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS group_members (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    added_by UUID NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
  )`,

  `CREATE TABLE IF NOT EXISTS emergency_groups (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    alert_protocol TEXT DEFAULT 'standard',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS emergency_group_members (
    id BIGSERIAL PRIMARY KEY,
    emergency_group_id BIGINT NOT NULL REFERENCES emergency_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    added_by UUID NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(emergency_group_id, user_id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id)`,
  `CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_emergency_group_members_group_id ON emergency_group_members(emergency_group_id)`,
  `CREATE INDEX IF NOT EXISTS idx_emergency_group_members_user_id ON emergency_group_members(user_id)`,
];

async function setupTables() {
  console.log("🔧 Setting up Supabase tables...\n");

  for (const query of queries) {
    try {
      const { error } = await supabase.rpc("exec_sql", { sql: query });
      if (error) {
        console.error("❌ Error executing query:", error.message);
      } else {
        console.log("✅ Query executed successfully");
      }
    } catch (error) {
      console.error("❌ Exception:", error.message);
    }
  }

  console.log("\n✓ Setup complete!");
}

setupTables().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

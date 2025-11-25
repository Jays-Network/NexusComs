const https = require("https");
require("dotenv").config();

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

async function executeQuery(query) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query });

    const options = {
      hostname: new URL(process.env.SUPABASE_URL).hostname,
      port: 443,
      path: "/rest/v1/rpc/sql",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function setupTables() {
  console.log("🔧 Setting up Supabase tables via REST API...\n");

  for (let i = 0; i < queries.length; i++) {
    try {
      const query = queries[i];
      console.log(`[${i + 1}/${queries.length}] Executing query...`);
      await executeQuery(query);
      console.log(`✅ Query ${i + 1} executed successfully\n`);
    } catch (error) {
      console.error(`❌ Query ${i + 1} failed:`, error.message);
      // Continue anyway to try remaining queries
    }
  }

  console.log("✓ Setup complete!");
}

setupTables().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

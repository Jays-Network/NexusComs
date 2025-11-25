const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcrypt");
const https = require("https");
const { StreamChat } = require("stream-chat");

dotenv.config();

// Initialize Stream Chat server client for token generation
let streamServerClient = null;
if (process.env.STREAM_API_KEY && process.env.STREAM_API_SECRET) {
  try {
    streamServerClient = StreamChat.getInstance(
      process.env.STREAM_API_KEY,
      process.env.STREAM_API_SECRET
    );
    console.log("✓ Stream Chat server client initialized");
  } catch (error) {
    console.error("✗ Failed to initialize Stream Chat:", error.message);
  }
} else {
  console.error("✗ STREAM_API_KEY or STREAM_API_SECRET not set - Stream tokens will not work");
}

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
);

// Brevo API email sender using REST API
const sendBrevoEmail = async (to, subject, html) => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      sender: {
        name: "NexusComs",
        email: process.env.EMAIL_FROM || "noreply@worldrisk.co.za",
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html,
    });

    const options = {
      hostname: "api.brevo.com",
      port: 443,
      path: "/v3/smtp/email",
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
        "content-length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          console.error(`Brevo API error ${res.statusCode}: ${data}`);
          reject(new Error(`API Error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", (e) => {
      console.error("Brevo email send failed:", e.message);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
};

// Verify Brevo API key on startup
if (process.env.BREVO_API_KEY) {
  console.log("✓ Brevo API Key configured - Ready to send emails");
} else {
  console.error(
    "✗ BREVO_API_KEY not set - Password reset emails will NOT be sent",
  );
}

app.use(cors());
app.use(express.json());

// Serve static CMS files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Session middleware
const sessionMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

// ============= AUTH ENDPOINTS =============

// In-memory storage for verification codes (with expiry)
const verificationCodes = new Map();

// Send verification code to email
app.post("/api/auth/send-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    // Check if user exists
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, username")
      .eq("email", email)
      .single();

    if (userError || !users) {
      return res.status(400).json({ error: "Email not found" });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store code
    verificationCodes.set(email, { code, expiresAt, attempts: 0 });

    // Send email
    try {
      const emailHtml = `
        <h2>Your Verification Code</h2>
        <p>Use this code to access the NexusComs Admin Dashboard:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; background: #D4AF37; color: #1a1a1a; padding: 16px; border-radius: 8px; text-align: center; display: inline-block;">${code}</p>
        <p><strong>This code expires in 10 minutes.</strong></p>
        <p>If you didn't request this code, please ignore this email.</p>
      `;

      await sendBrevoEmail(users.email, "NexusComs Verification Code", emailHtml);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError.message);
      return res.status(500).json({ error: "Failed to send verification code" });
    }

    res.json({ message: "Verification code sent to your email" });
  } catch (error) {
    console.error("Send code error:", error);
    res.status(500).json({ error: "Failed to send code" });
  }
});

// Verify code and login
app.post("/api/auth/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code required" });
    }

    // Check code
    const stored = verificationCodes.get(email);
    if (!stored) {
      return res.status(400).json({ error: "No code sent for this email. Request a new one." });
    }

    // Check expiry
    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(email);
      return res.status(400).json({ error: "Code expired. Request a new one." });
    }

    // Check attempts (max 5)
    if (stored.attempts >= 5) {
      verificationCodes.delete(email);
      return res.status(400).json({ error: "Too many attempts. Request a new code." });
    }

    // Verify code
    if (code !== stored.code) {
      stored.attempts++;
      return res.status(400).json({ error: "Invalid code" });
    }

    // Get user
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, username")
      .eq("email", email)
      .single();

    if (userError || !users) {
      return res.status(401).json({ error: "User not found" });
    }

    // Generate session token
    const token = jwt.sign(
      { id: users.id, email: users.email, username: users.username },
      process.env.SESSION_SECRET,
      { expiresIn: "7d" },
    );

    // Update last_login
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", users.id);

    // Clear code
    verificationCodes.delete(email);

    res.json({
      token,
      user: { id: users.id, email: users.email, username: users.username },
    });
  } catch (error) {
    console.error("Verify code error:", error);
    res.status(500).json({ error: "Verification failed" });
  }
});

// Login with username/email and password
app.post("/api/auth/login", async (req, res) => {
  try {
    console.log("🔐 [LOGIN] Received login request");
    const { username, email, password } = req.body;
    const loginIdentifier = username || email;
    console.log("📝 [LOGIN] Identifier:", loginIdentifier);

    if (!loginIdentifier || !password) {
      console.warn("⚠️ [LOGIN] Missing username/email or password");
      return res.status(400).json({ error: "Username and password required" });
    }

    // Get user from Supabase by username or email
    console.log("🔍 [LOGIN] Querying Supabase for user:", loginIdentifier);
    let query = supabase
      .from("users")
      .select("id, email, password_hash, username");
    
    // Try username first, then email if it looks like an email
    if (loginIdentifier.includes('@')) {
      query = query.eq("email", loginIdentifier);
    } else {
      query = query.eq("username", loginIdentifier);
    }
    
    const { data: users, error: userError } = await query.single();

    if (userError) {
      console.error("❌ [LOGIN] Supabase error:", userError.message);
      addLog("ERROR", "Backend", "Login - Supabase query failed", userError.message);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!users) {
      console.warn("⚠️ [LOGIN] User not found:", username);
      addLog("WARN", "Backend", "Login attempt - User not found", username);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    console.log("🔑 [LOGIN] Verifying password for user:", username);
    const passwordMatch = await bcrypt.compare(password, users.password_hash);
    if (!passwordMatch) {
      console.warn("⚠️ [LOGIN] Invalid password for user:", username);
      addLog("WARN", "Backend", "Login attempt - Invalid password", username);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate session token
    console.log("🎫 [LOGIN] Generating session token for user:", username);
    const token = jwt.sign(
      { id: users.id, email: users.email, username: users.username },
      process.env.SESSION_SECRET,
      { expiresIn: "7d" },
    );

    // Update last_login
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", users.id);

    console.log("✅ [LOGIN] Successful login for user:", username);
    addLog("INFO", "Backend", "User logged in successfully", username);
    
    res.json({
      token,
      user: { id: users.id, email: users.email, username: users.username },
    });
  } catch (error) {
    console.error("❌ [LOGIN] Unexpected error:", error);
    addLog("ERROR", "Backend", "Login endpoint error", error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: "Login failed" });
  }
});

// Handle password change request from new user creation
app.post("/api/users", sessionMiddleware, async (req, res) => {
  try {
    const { email, username, password, account_name, billing_plan, permissions } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: "Email, username, and password required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          email,
          username,
          password_hash: hashedPassword,
          account_name: account_name || "",
          billing_plan: billing_plan || "basic",
          location_tracking: false,
          last_device: null,
          permissions: permissions || {
            can_create_groups: false,
            can_change_password: true,
            can_access_cms: false,
            is_enabled: true,
            can_edit_profile: false,
          },
        },
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data[0]);
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Register endpoint (for first admin setup)
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res
        .status(400)
        .json({ error: "Email, password, and username required" });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          email,
          password_hash,
          username,
          is_admin: false,
        },
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Generate token
    const token = jwt.sign(
      { id: data[0].id, email: data[0].email, username: data[0].username },
      process.env.SESSION_SECRET,
      { expiresIn: "7d" },
    );

    res.json({ token, user: data[0] });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ============= PASSWORD RESET ENDPOINTS =============

// Request password reset (verify user by email only)
app.post("/api/auth/request-reset", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    // Find user by email only
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, username")
      .eq("email", email)
      .single();

    if (userError || !users) {
      // Security: Don't reveal if user exists
      return res.status(200).json({
        message:
          "If an account exists with this email, a reset link has been sent",
      });
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = require("crypto").randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 3600000).toISOString();

    // Store reset token in database
    const { error: updateError } = await supabase
      .from("users")
      .update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires,
      })
      .eq("id", users.id);

    if (updateError) {
      return res.status(500).json({ error: "Failed to process reset request" });
    }

    // Construct dynamic reset link using request headers
    const protocol = req.headers["x-forwarded-proto"] || "https";
    const host = req.get("host");
    const baseUrl = `${protocol}://${host}`;
    const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

    try {
      const emailHtml = `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your NexusComs account.</p>
        <p><strong>This link expires in 1 hour.</strong></p>
        <p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px;">
            Reset Password
          </a>
        </p>
        <p>Or copy this link: ${resetLink}</p>
        <p>If you didn't request this, please ignore this email.</p>
      `;

      await sendBrevoEmail(users.email, "NexusComs Password Reset", emailHtml);
    } catch (emailError) {
      console.error("Failed to send reset email:", emailError.message);
      // Don't fail the response - token is already saved
    }

    res.json({
      message:
        "If an account exists with this email, a reset link has been sent",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({ error: "Failed to request password reset" });
  }
});

// Reset password with token
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res
        .status(400)
        .json({ error: "Reset token and new password required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Find user with valid reset token
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("password_reset_token", resetToken)
      .gt("password_reset_expires", new Date().toISOString())
      .single();

    if (userError || !users) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Hash new password
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    const { error: updateError } = await supabase
      .from("users")
      .update({
        password_hash,
        password_reset_token: null,
        password_reset_expires: null,
      })
      .eq("id", users.id);

    if (updateError) {
      return res.status(500).json({ error: "Failed to reset password" });
    }

    res.json({
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// ============= USER MANAGEMENT ENDPOINTS =============

// Get all users (with pagination)
app.get("/api/users", sessionMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const {
      data: users,
      error,
      count,
    } = await supabase
      .from("users")
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      users,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get single user
app.get("/api/users/:id", sessionMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(data);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Create user
app.post("/api/users", sessionMiddleware, async (req, res) => {
  try {
    const { email, username, account_name, billing_plan, permissions } =
      req.body;

    if (!email || !username) {
      return res.status(400).json({ error: "Email and username required" });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const password_hash = await bcrypt.hash(tempPassword, 10);

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          email,
          username,
          password_hash,
          creator_id: req.user.id,
          account_name: account_name || "",
          billing_plan: billing_plan || "basic",
          location_tracking: false,
          last_device: null,
          permissions: permissions || {
            can_create_groups: false,
            can_change_password: true,
            can_access_cms: false,
            is_enabled: true,
            can_edit_profile: false,
          },
        },
      ])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      user: data[0],
      tempPassword,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Update user
app.put("/api/users/:id", sessionMiddleware, async (req, res) => {
  try {
    const { username, account_name, billing_plan, permissions, location_tracking, password } =
      req.body;

    const updateData = {};
    if (username) updateData.username = username;
    if (account_name) updateData.account_name = account_name;
    if (billing_plan) updateData.billing_plan = billing_plan;
    if (permissions) updateData.permissions = permissions;
    if (location_tracking !== undefined) updateData.location_tracking = location_tracking;
    
    // Handle password update
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password_hash = hashedPassword;
    }
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", req.params.id)
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json(data[0]);
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user
app.delete("/api/users/:id", sessionMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", req.params.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ============= STREAM TOKEN ENDPOINT =============

// Stream token generation endpoint
app.post("/api/auth/stream-token", async (req, res) => {
  try {
    const { userId, userName, userImage } = req.body;

    if (!userId || !userName) {
      return res
        .status(400)
        .json({ error: "userId and userName are required" });
    }

    // Sanitize user ID to be Stream-compatible (lowercase, only alphanumeric, underscore, dash)
    const sanitizedUserId = userId.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    console.log(`[Stream] Generating token for user: ${sanitizedUserId}`);

    // Check if Stream client is available
    if (!streamServerClient) {
      console.error("[Stream] Server client not initialized");
      return res.status(500).json({ 
        error: "Stream Chat not configured - STREAM_API_KEY or STREAM_API_SECRET missing" 
      });
    }

    // Generate real Stream token using the server SDK
    const token = streamServerClient.createToken(sanitizedUserId);
    console.log(`[Stream] Token generated successfully for: ${sanitizedUserId}`);

    // Optionally upsert the user to Stream (creates or updates)
    try {
      await streamServerClient.upsertUser({
        id: sanitizedUserId,
        name: userName,
        image: userImage || undefined,
      });
      console.log(`[Stream] User upserted: ${sanitizedUserId}`);
    } catch (upsertError) {
      console.warn(`[Stream] User upsert warning: ${upsertError.message}`);
      // Continue even if upsert fails - token is still valid
    }

    res.json({
      token: token,
      userId: sanitizedUserId,
      apiKey: process.env.STREAM_API_KEY,
    });
  } catch (error) {
    console.error("Stream token error:", error);
    res.status(500).json({ error: "Failed to generate token: " + error.message });
  }
});

// Root endpoint - API status (CMS UI accessed via static files)
app.get("/", (req, res) => {
  res.json({ status: "NexusComs Hybrid API running", mode: "API & CMS" });
});

// ============= LOGGING SYSTEM =============

// Global logs array (in-memory, persists during server runtime)
let systemLogs = [];
const MAX_LOGS = 1000;

// Function to add log entry
function addLog(level, source, message, details = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    details,
  };
  systemLogs.unshift(logEntry); // Add to beginning
  if (systemLogs.length > MAX_LOGS) {
    systemLogs.pop(); // Remove oldest
  }
  console.log(`[${level}] ${source}: ${message}`);
}

// Get logs endpoint
app.get("/api/logs", sessionMiddleware, async (req, res) => {
  try {
    const { filter, limit = 100 } = req.query;
    let filteredLogs = systemLogs;

    if (filter) {
      if (filter === "ERROR" || filter === "WARN" || filter === "INFO") {
        filteredLogs = systemLogs.filter((log) => log.level === filter);
      } else {
        filteredLogs = systemLogs.filter((log) =>
          log.source.toLowerCase().includes(filter.toLowerCase()),
        );
      }
    }

    res.json(filteredLogs.slice(0, parseInt(limit)));
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// Clear logs endpoint
app.delete("/api/logs", sessionMiddleware, async (req, res) => {
  try {
    systemLogs = [];
    res.json({ message: "Logs cleared successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear logs" });
  }
});

// ============= SERVICE STATUS ENDPOINTS =============

// Check all external services status
app.get("/api/services/status", async (req, res) => {
  const services = {
    stream: { status: "unknown", error: null, severity: null },
    supabase: { status: "unknown", error: null, severity: null },
    brevo: { status: "unknown", error: null, severity: null },
    expo: { status: "unknown", error: null, severity: null },
  };

  // Check Stream
  if (process.env.EXPO_PUBLIC_STREAM_API_KEY) {
    services.stream.status = "connected";
  } else {
    services.stream.status = "disconnected";
    services.stream.error = "Stream API Key not configured";
    services.stream.severity = "critical";
    addLog("ERROR", "Stream", "Stream API Key not configured");
  }

  // Check Supabase
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      // Quick test query
      const { error } = await supabase.from("users").select("count");
      if (error) {
        services.supabase.status = "error";
        services.supabase.error = error.message;
        services.supabase.severity = "critical";
        addLog("ERROR", "Supabase", "Database query failed", error.message);
      } else {
        services.supabase.status = "connected";
      }
    } catch (e) {
      services.supabase.status = "error";
      services.supabase.error = "Database connection timeout";
      services.supabase.severity = "critical";
      addLog("ERROR", "Supabase", "Database connection timeout", e.message);
    }
  } else {
    services.supabase.status = "disconnected";
    services.supabase.error = "Supabase credentials not configured";
    services.supabase.severity = "critical";
    addLog("ERROR", "Supabase", "Credentials not configured");
  }

  // Check Brevo
  if (process.env.BREVO_API_KEY) {
    services.brevo.status = "connected";
  } else {
    services.brevo.status = "disconnected";
    services.brevo.error = "Brevo API Key not configured - Email features disabled";
    services.brevo.severity = "minor";
    addLog("WARN", "Brevo", "Email service not configured - password reset emails disabled");
  }

  // Check Expo (frontend deployment)
  services.expo.status = "connected";

  res.json(services);
});

// ============= BILLING PLANS CONFIGURATION =============

const BILLING_PLANS = {
  basic: {
    name: 'Basic',
    tier: 1,
    permissions: {
      can_create_groups: false,
      can_access_cms: false,
      can_edit_profile: false,
      location_tracking: 'active_only',
      contact_list: 'allowed_only',
      group_management: 'backend_only'
    },
    description: 'Restricted access for standard users'
  },
  admin: {
    name: 'Admin',
    tier: 2,
    permissions: {
      can_create_groups: true,
      can_access_cms: 'limited',
      can_edit_profile: true,
      location_tracking: 'full',
      contact_list: 'admin_and_below',
      group_management: 'frontend_admin'
    },
    description: 'Enhanced access for group administrators'
  },
  executive: {
    name: 'Executive',
    tier: 3,
    permissions: {
      can_create_groups: true,
      can_access_cms: true,
      can_edit_profile: true,
      location_tracking: 'full',
      contact_list: 'all',
      group_management: 'full_control',
      can_allocate_permissions: true
    },
    description: 'Full unrestricted access'
  }
};

// Get billing plans configuration
app.get("/api/billing-plans", async (req, res) => {
  res.json(BILLING_PLANS);
});

// Get permissions for a specific billing plan
app.get("/api/billing-plans/:plan", async (req, res) => {
  const plan = req.params.plan.toLowerCase();
  if (BILLING_PLANS[plan]) {
    res.json(BILLING_PLANS[plan]);
  } else {
    res.status(404).json({ error: "Billing plan not found" });
  }
});

// Check user access based on billing plan
app.get("/api/billing-plans/:plan/can-access/:feature", async (req, res) => {
  const plan = req.params.plan.toLowerCase();
  const feature = req.params.feature;
  
  const planConfig = BILLING_PLANS[plan] || BILLING_PLANS.basic;
  const permission = planConfig.permissions[feature];
  
  let canAccess = false;
  let accessLevel = 'none';
  
  if (permission === true || permission === 'full' || permission === 'all' || permission === 'full_control') {
    canAccess = true;
    accessLevel = 'full';
  } else if (permission === 'limited' || permission === 'admin_and_below' || permission === 'frontend_admin' || permission === 'active_only' || permission === 'allowed_only') {
    canAccess = true;
    accessLevel = 'limited';
  }
  
  res.json({ canAccess, accessLevel, permission });
});

// Get available users for group assignment (with billing plan info)
app.get("/api/users/available", sessionMiddleware, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, username, email, billing_plan, stream_id")
      .order("username");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(users || []);
  } catch (error) {
    console.error("Error fetching available users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ============= GROUPS & EMERGENCY GROUPS MANAGEMENT =============

// Create a new group
app.post("/api/groups", sessionMiddleware, async (req, res) => {
  try {
    const { name, description, parentGroupId, memberIds } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Group name required" });
    }

    // Create group in Supabase
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .insert({
        name,
        description,
        parent_group_id: parentGroupId,
        created_by: req.user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (groupError) {
      console.error("Group creation error:", groupError);
      addLog("ERROR", "Groups", "Failed to create group", groupError.message);
      return res.status(500).json({ error: "Failed to create group" });
    }

    // Create corresponding Stream channel
    let streamChannelId = null;
    if (streamServerClient && group) {
      try {
        streamChannelId = `group-${group.id}`;
        await streamServerClient.createChannel('team', streamChannelId, {
          name: name,
          image: null,
          description: description,
          custom: {
            type: 'group',
            groupId: group.id,
          }
        });
        console.log(`Stream channel created for group: ${group.id}`);
        addLog("INFO", "Stream", `Channel created for group: ${name}`);
      } catch (streamError) {
        console.warn(`Stream channel creation warning: ${streamError.message}`);
        addLog("WARN", "Stream", `Could not create channel for group ${name}`, streamError.message);
      }
    }

    // Add members to group and Stream channel
    if (memberIds && memberIds.length > 0) {
      try {
        // Get user details for Stream IDs
        const { data: users } = await supabase
          .from("users")
          .select("id, stream_id")
          .in("id", memberIds);

        if (users && users.length > 0) {
          // Add members to Supabase group_members table
          const memberRecords = users.map(user => ({
            group_id: group.id,
            user_id: user.id,
            added_by: req.user.id,
            added_at: new Date().toISOString(),
          }));

          const { error: memberError } = await supabase
            .from("group_members")
            .insert(memberRecords);

          if (memberError) {
            console.warn("Error adding members to Supabase:", memberError);
          }

          // Add members to Stream channel
          if (streamServerClient && streamChannelId) {
            try {
              const streamUserIds = users
                .map(u => u.stream_id)
                .filter(id => id != null);
              
              if (streamUserIds.length > 0) {
                await streamServerClient.addChannelMembers(
                  `team:${streamChannelId}`,
                  streamUserIds
                );
                console.log(`Added ${streamUserIds.length} members to Stream channel`);
                addLog("INFO", "Stream", `Added ${streamUserIds.length} members to group ${name}`);
              }
            } catch (streamMemberError) {
              console.warn(`Error adding members to Stream: ${streamMemberError.message}`);
              addLog("WARN", "Stream", `Could not add members to Stream channel`, streamMemberError.message);
            }
          }
        }
      } catch (error) {
        console.error("Error processing members:", error);
        addLog("WARN", "Groups", "Error adding members to group", error.message);
      }
    }

    res.status(201).json({ 
      message: "Group created successfully with members", 
      group 
    });
  } catch (error) {
    console.error("Create group error:", error);
    addLog("ERROR", "Groups", "Server error creating group", error.message);
    res.status(500).json({ error: "Failed to create group" });
  }
});

// Get all groups
app.get("/api/groups", sessionMiddleware, async (req, res) => {
  try {
    const { data: groups, error } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: "Failed to fetch groups" });
    }

    res.json(groups || []);
  } catch (error) {
    console.error("Fetch groups error:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

// Create a new emergency group
app.post("/api/emergency-groups", sessionMiddleware, async (req, res) => {
  try {
    const { name, description, alertProtocol, memberIds } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Emergency group name required" });
    }

    // Create emergency group in Supabase
    const { data: emergencyGroup, error: groupError } = await supabase
      .from("emergency_groups")
      .insert({
        name,
        description,
        alert_protocol: alertProtocol || "standard",
        created_by: req.user.id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (groupError) {
      console.error("Emergency group creation error:", groupError);
      addLog("ERROR", "Emergency Groups", "Failed to create emergency group", groupError.message);
      return res.status(500).json({ error: "Failed to create emergency group" });
    }

    // Create corresponding Stream channel
    let streamChannelId = null;
    if (streamServerClient && emergencyGroup) {
      try {
        streamChannelId = `emergency-${emergencyGroup.id}`;
        await streamServerClient.createChannel('team', streamChannelId, {
          name: name,
          image: null,
          description: description,
          custom: {
            type: 'emergency',
            groupId: emergencyGroup.id,
            alertProtocol: alertProtocol || "standard",
          }
        });
        console.log(`Stream emergency channel created: ${emergencyGroup.id}`);
        addLog("INFO", "Stream", `Emergency channel created: ${name}`);
      } catch (streamError) {
        console.warn(`Stream emergency channel creation warning: ${streamError.message}`);
        addLog("WARN", "Stream", `Could not create emergency channel for ${name}`, streamError.message);
      }
    }

    // Add members to emergency group and Stream channel
    if (memberIds && memberIds.length > 0) {
      try {
        // Get user details for Stream IDs
        const { data: users } = await supabase
          .from("users")
          .select("id, stream_id")
          .in("id", memberIds);

        if (users && users.length > 0) {
          // Add members to Supabase emergency_group_members table
          const memberRecords = users.map(user => ({
            emergency_group_id: emergencyGroup.id,
            user_id: user.id,
            added_by: req.user.id,
            added_at: new Date().toISOString(),
          }));

          const { error: memberError } = await supabase
            .from("emergency_group_members")
            .insert(memberRecords);

          if (memberError) {
            console.warn("Error adding members to emergency group:", memberError);
          }

          // Add members to Stream channel
          if (streamServerClient && streamChannelId) {
            try {
              const streamUserIds = users
                .map(u => u.stream_id)
                .filter(id => id != null);
              
              if (streamUserIds.length > 0) {
                await streamServerClient.addChannelMembers(
                  `team:${streamChannelId}`,
                  streamUserIds
                );
                console.log(`Added ${streamUserIds.length} members to emergency Stream channel`);
                addLog("INFO", "Stream", `Added ${streamUserIds.length} members to emergency group ${name}`);
              }
            } catch (streamMemberError) {
              console.warn(`Error adding members to Stream: ${streamMemberError.message}`);
              addLog("WARN", "Stream", `Could not add members to emergency Stream channel`, streamMemberError.message);
            }
          }
        }
      } catch (error) {
        console.error("Error processing emergency group members:", error);
        addLog("WARN", "Emergency Groups", "Error adding members to emergency group", error.message);
      }
    }

    res.status(201).json({ 
      message: "Emergency group created successfully with members", 
      emergencyGroup 
    });
  } catch (error) {
    console.error("Create emergency group error:", error);
    addLog("ERROR", "Emergency Groups", "Server error creating emergency group", error.message);
    res.status(500).json({ error: "Failed to create emergency group" });
  }
});

// Get all emergency groups
app.get("/api/emergency-groups", sessionMiddleware, async (req, res) => {
  try {
    const { data: emergencyGroups, error } = await supabase
      .from("emergency_groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: "Failed to fetch emergency groups" });
    }

    res.json(emergencyGroups || []);
  } catch (error) {
    console.error("Fetch emergency groups error:", error);
    res.status(500).json({ error: "Failed to fetch emergency groups" });
  }
});

// Get list of available users for member assignment
app.get("/api/users/available", sessionMiddleware, async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("id, username, email, stream_id")
      .order("username", { ascending: true });

    if (error) {
      return res.status(500).json({ error: "Failed to fetch users" });
    }

    res.json(users || []);
  } catch (error) {
    console.error("Fetch available users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    supabase: process.env.SUPABASE_URL ? "configured" : "not-configured",
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✓ Hybrid API & CMS server running on port ${PORT}`);
  console.log(
    `✓ Supabase: ${process.env.SUPABASE_URL ? "Configured" : "Missing"}`,
  );
  console.log(`✓ Brevo Email: ${process.env.BREVO_API_KEY ? "Configured" : "Missing"}`);
  console.log(`✓ API & CMS available at http://localhost:${PORT}`);
});

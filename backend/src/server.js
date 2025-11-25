const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcrypt");
const https = require("https");

dotenv.config();

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

// Legacy login endpoint (kept for backwards compatibility)
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Get user from Supabase
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, password_hash, username")
      .eq("email", email)
      .single();

    if (userError || !users) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, users.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
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

    res.json({
      token,
      user: { id: users.id, email: users.email, username: users.username },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
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
    const { username, account_name, billing_plan, permissions, host_mask } =
      req.body;

    const updateData = {};
    if (username) updateData.username = username;
    if (account_name) updateData.account_name = account_name;
    if (billing_plan) updateData.billing_plan = billing_plan;
    if (permissions) updateData.permissions = permissions;
    if (host_mask) updateData.host_mask = host_mask;
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

// Legacy endpoint for Stream token generation
app.post("/api/auth/stream-token", async (req, res) => {
  try {
    const { userId, userName, userImage } = req.body;

    if (!userId || !userName) {
      return res
        .status(400)
        .json({ error: "userId and userName are required" });
    }

    const sanitizedUserId = userId.toLowerCase().replace(/[^a-z0-9_-]/g, "_");

    // Note: Stream SDK integration would go here
    // For now, return a mock token structure
    res.json({
      token: "mock-token-" + sanitizedUserId,
      userId: sanitizedUserId,
      apiKey: process.env.STREAM_API_KEY || "mock-key",
    });
  } catch (error) {
    console.error("Stream token error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Root endpoint - API status (CMS UI accessed via static files)
app.get("/", (req, res) => {
  res.json({ status: "NexusComs Hybrid API running", mode: "API & CMS" });
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

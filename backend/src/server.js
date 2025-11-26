const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcrypt");
const https = require("https");
const { StreamChat } = require("stream-chat");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Security imports
const securityRoutes = require("./routes/security");
const { securityMonitor } = require("./middleware/securityMonitor");
const { exec } = require("child_process");
const { addSecurityAlert } = require("./utils/alerts");

dotenv.config();

// Automated dependency vulnerability audit on startup
const fs = require("fs");
const AUDIT_LOG_FILE = path.join(__dirname, "../logs/npm-audit.log");

const ensureAuditLogDir = () => {
  const logDir = path.dirname(AUDIT_LOG_FILE);
  if (!fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (error) {
      console.error("[SECURITY] Failed to create audit log directory:", error.message);
    }
  }
};

const parseAuditOutput = (stdout) => {
  try {
    const auditData = JSON.parse(stdout || "{}");
    
    // Support both npm v8+ (metadata.vulnerabilities) and older formats
    if (auditData.metadata && auditData.metadata.vulnerabilities) {
      // npm v8+ format
      return auditData.metadata.vulnerabilities;
    } else if (auditData.vulnerabilities) {
      // Older format - count by severity
      const vulnList = Object.values(auditData.vulnerabilities);
      return {
        critical: vulnList.filter(v => v.severity === "critical").length,
        high: vulnList.filter(v => v.severity === "high").length,
        moderate: vulnList.filter(v => v.severity === "moderate").length,
        low: vulnList.filter(v => v.severity === "low").length,
        total: vulnList.length
      };
    }
    return { critical: 0, high: 0, moderate: 0, low: 0, total: 0 };
  } catch (e) {
    return null;
  }
};

const writeAuditLog = (scope, counts, rawOutput) => {
  ensureAuditLogDir();
  const timestamp = new Date().toISOString();
  const logEntry = `
================================================================================
Audit Run: ${timestamp}
Scope: ${scope}
================================================================================
Summary:
  - Critical: ${counts.critical}
  - High: ${counts.high}
  - Moderate: ${counts.moderate}
  - Low: ${counts.low}
  - Total: ${counts.total || (counts.critical + counts.high + counts.moderate + counts.low)}

Raw Output:
${rawOutput}
================================================================================
`;
  try {
    fs.appendFileSync(AUDIT_LOG_FILE, logEntry);
  } catch (error) {
    console.error("[SECURITY] Failed to write audit log:", error.message);
  }
};

const runAuditForScope = (scope, cwd) => {
  return new Promise((resolve) => {
    exec("npm audit --json 2>/dev/null", { cwd, timeout: 60000 }, (error, stdout) => {
      const counts = parseAuditOutput(stdout);
      if (counts) {
        writeAuditLog(scope, counts, stdout.substring(0, 5000)); // Limit raw output
        resolve({ scope, counts, success: true });
      } else {
        resolve({ scope, counts: { critical: 0, high: 0, moderate: 0, low: 0 }, success: false });
      }
    });
  });
};

const runStartupSecurityAudit = async () => {
  console.log("[SECURITY] Running automated dependency audit...");
  
  // Audit backend dependencies (primary concern for server security)
  const backendDir = path.join(__dirname, "..");
  const backendResult = await runAuditForScope("backend", backendDir);
  
  if (backendResult.success) {
    const counts = backendResult.counts;
    const total = counts.total || (counts.critical + counts.high + counts.moderate + counts.low);
    
    if (total > 0) {
      console.log(`[SECURITY] Backend audit: ${total} vulnerabilities found`);
      console.log(`  - Critical: ${counts.critical}`);
      console.log(`  - High: ${counts.high}`);
      console.log(`  - Moderate: ${counts.moderate}`);
      console.log(`  - Low: ${counts.low}`);
      console.log(`[SECURITY] Audit log: ${AUDIT_LOG_FILE}`);
      
      if (counts.critical > 0 || counts.high > 5) {
        addSecurityAlert(
          "npm_vulnerability",
          `Backend dependency audit found ${counts.critical} critical and ${counts.high} high vulnerabilities. See ${AUDIT_LOG_FILE}`,
          counts.critical > 0 ? "critical" : "high"
        );
        console.log("[SECURITY] ⚠️  Run 'cd backend && npm audit fix' to address vulnerabilities");
      }
    } else {
      console.log("[SECURITY] ✓ No vulnerabilities found in backend dependencies");
    }
  } else {
    console.log("[SECURITY] Backend audit check completed (no vulnerabilities or npm audit unavailable)");
  }
};

// Run security audit after server starts
setTimeout(runStartupSecurityAudit, 3000);

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

// Trust proxy - required for rate limiting to work correctly behind Replit's proxy
app.set('trust proxy', 1);

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

// ============= SECURITY HARDENING =============

// Helmet - Security headers (CSP, X-Frame-Options, X-XSS-Protection, etc.)
// Helmet security headers - disabled for admin UI compatibility
// TODO: Re-enable with proper CSP configuration for production
// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
//       styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
//       fontSrc: ["'self'", "https://fonts.gstatic.com"],
//       imgSrc: ["'self'", "data:", "https:"],
//       connectSrc: ["'self'", "https://api.brevo.com", "wss:", "https:"],
//     }
//   },
//   crossOriginEmbedderPolicy: false,
//   crossOriginResourcePolicy: { policy: "cross-origin" }
// }));

// Use helmet with CSP disabled for now (admin UI uses inline scripts)
app.use(helmet({
  contentSecurityPolicy: false
}));

// CORS - Restrictive configuration
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : ['http://localhost:8081', 'http://localhost:3000', 'https://localhost:8081'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - General API
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Disable validation to avoid X-Forwarded-For errors in dev
});
app.use('/api/', generalLimiter);

// Rate limiting - Authentication endpoints (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 auth attempts per window
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Disable validation to avoid X-Forwarded-For errors in dev
  handler: (req, res, next, options) => {
    addSecurityAlert('rate_limit', `Auth rate limit exceeded for IP: ${req.ip}`, 'medium');
    res.status(429).json(options.message);
  }
});
app.use('/api/auth/', authLimiter);

// Security monitoring middleware (must be before routes)
app.use(securityMonitor);

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

// Admin-only middleware (for security dashboard write operations)
const adminOnlyMiddleware = (req, res, next) => {
  // Check if user has admin role (from JWT or database)
  // For now, we restrict write operations to users with admin permission
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  // Check permissions from JWT payload
  const permissions = req.user.permissions || {};
  const isAdmin = permissions.admin === true || 
                  permissions.superAdmin === true || 
                  req.user.role === 'admin';
  
  // GET requests allowed for all authenticated users (read-only)
  if (req.method === 'GET') {
    return next();
  }
  
  // POST/DELETE (write) operations require admin
  if (!isAdmin) {
    addSecurityAlert('unauthorized_access', `Non-admin user ${req.user.email || req.user.id} attempted security write operation`, 'medium');
    return res.status(403).json({ error: "Admin access required for this operation" });
  }
  
  next();
};

// Mount security routes (PROTECTED - requires authentication + admin for writes)
app.use('/api/security', sessionMiddleware, adminOnlyMiddleware, securityRoutes);

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

    // Normalize email to lowercase for consistent storage
    const normalizedEmail = email.toLowerCase();

    // Check if user exists (case-insensitive email lookup)
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, username")
      .ilike("email", normalizedEmail)
      .single();

    if (userError || !users) {
      return res.status(400).json({ error: "Email not found" });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store code with normalized email
    verificationCodes.set(normalizedEmail, { code, expiresAt, attempts: 0 });

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

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    // Check code
    const stored = verificationCodes.get(normalizedEmail);
    if (!stored) {
      return res.status(400).json({ error: "No code sent for this email. Request a new one." });
    }

    // Check expiry
    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(normalizedEmail);
      return res.status(400).json({ error: "Code expired. Request a new one." });
    }

    // Check attempts (max 5)
    if (stored.attempts >= 5) {
      verificationCodes.delete(normalizedEmail);
      return res.status(400).json({ error: "Too many attempts. Request a new code." });
    }

    // Verify code
    if (code !== stored.code) {
      stored.attempts++;
      return res.status(400).json({ error: "Invalid code" });
    }

    // Get user (case-insensitive lookup)
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, username")
      .ilike("email", normalizedEmail)
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
    verificationCodes.delete(normalizedEmail);

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
      // Case-insensitive email lookup
      query = query.ilike("email", loginIdentifier.toLowerCase());
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

    // Find user by email only (case-insensitive)
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email, username")
      .ilike("email", email.toLowerCase())
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

// ============= ACCOUNTS ENDPOINTS =============

// Get all accounts with hierarchy info
app.get("/api/accounts", sessionMiddleware, async (req, res) => {
  try {
    const { data: accounts, error } = await supabase
      .from("accounts")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Fetch accounts error:", error);
      return res.status(500).json({ error: "Failed to fetch accounts" });
    }

    // Build hierarchy tree
    const accountMap = {};
    const rootAccounts = [];

    (accounts || []).forEach(account => {
      accountMap[account.id] = { ...account, children: [] };
    });

    (accounts || []).forEach(account => {
      if (account.parent_account_id && accountMap[account.parent_account_id]) {
        accountMap[account.parent_account_id].children.push(accountMap[account.id]);
      } else {
        rootAccounts.push(accountMap[account.id]);
      }
    });

    res.json({ accounts: accounts || [], tree: rootAccounts });
  } catch (error) {
    console.error("Fetch accounts error:", error);
    res.status(500).json({ error: "Failed to fetch accounts" });
  }
});

// Get single account with details
app.get("/api/accounts/:id", sessionMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get account
    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", id)
      .single();

    if (accountError || !account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Get assigned users
    const { data: users } = await supabase
      .from("users")
      .select("id, username, email, billing_plan")
      .eq("account_id", id);

    // Get assigned channels
    const { data: channelAssignments } = await supabase
      .from("account_channels")
      .select("*")
      .eq("account_id", id);

    // Get child accounts
    const { data: childAccounts } = await supabase
      .from("accounts")
      .select("id, name")
      .eq("parent_account_id", id);

    res.json({
      ...account,
      users: users || [],
      channels: channelAssignments || [],
      childAccounts: childAccounts || []
    });
  } catch (error) {
    console.error("Fetch account error:", error);
    res.status(500).json({ error: "Failed to fetch account" });
  }
});

// Create new account
app.post("/api/accounts", sessionMiddleware, async (req, res) => {
  try {
    const { name, description, parent_account_id, billing_plan } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Account name is required" });
    }

    // Check if parent account exists
    if (parent_account_id) {
      const { data: parentAccount } = await supabase
        .from("accounts")
        .select("id")
        .eq("id", parent_account_id)
        .single();

      if (!parentAccount) {
        return res.status(400).json({ error: "Parent account not found" });
      }
    }

    const { data: account, error } = await supabase
      .from("accounts")
      .insert({
        name,
        description: description || null,
        parent_account_id: parent_account_id || null,
        billing_plan: billing_plan || 'basic',
        created_by: req.user.userId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("Create account error:", error);
      return res.status(500).json({ error: "Failed to create account" });
    }

    addLog("INFO", "Accounts", `Account created: ${name}`);
    res.status(201).json(account);
  } catch (error) {
    console.error("Create account error:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// Update account
app.put("/api/accounts/:id", sessionMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parent_account_id, billing_plan } = req.body;

    // Prevent setting parent to self or creating cycles
    if (parent_account_id === parseInt(id)) {
      return res.status(400).json({ error: "Account cannot be its own parent" });
    }

    // Check for cycles in hierarchy
    if (parent_account_id) {
      const { data: descendants } = await supabase
        .from("accounts")
        .select("id, parent_account_id");
      
      // Simple cycle detection
      const isDescendant = (checkId, targetId, accounts) => {
        const account = accounts.find(a => a.id === checkId);
        if (!account) return false;
        if (account.parent_account_id === targetId) return true;
        if (account.parent_account_id) {
          return isDescendant(account.parent_account_id, targetId, accounts);
        }
        return false;
      };

      if (isDescendant(parent_account_id, parseInt(id), descendants || [])) {
        return res.status(400).json({ error: "Cannot create circular hierarchy" });
      }
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (parent_account_id !== undefined) updateData.parent_account_id = parent_account_id;
    if (billing_plan !== undefined) updateData.billing_plan = billing_plan;

    const { data: account, error } = await supabase
      .from("accounts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update account error:", error);
      return res.status(500).json({ error: "Failed to update account" });
    }

    addLog("INFO", "Accounts", `Account updated: ${account.name}`);
    res.json(account);
  } catch (error) {
    console.error("Update account error:", error);
    res.status(500).json({ error: "Failed to update account" });
  }
});

// Delete account
app.delete("/api/accounts/:id", sessionMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if account has children
    const { data: children } = await supabase
      .from("accounts")
      .select("id")
      .eq("parent_account_id", id);

    if (children && children.length > 0) {
      return res.status(400).json({ 
        error: "Cannot delete account with child accounts. Delete or reassign children first." 
      });
    }

    // Remove account_id from users
    await supabase
      .from("users")
      .update({ account_id: null })
      .eq("account_id", id);

    // Delete channel assignments
    await supabase
      .from("account_channels")
      .delete()
      .eq("account_id", id);

    // Delete account
    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete account error:", error);
      return res.status(500).json({ error: "Failed to delete account" });
    }

    addLog("INFO", "Accounts", `Account deleted: ${id}`);
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// Assign users to account
app.post("/api/accounts/:id/users", sessionMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: "userIds array is required" });
    }

    // Update users to belong to this account
    const { error } = await supabase
      .from("users")
      .update({ account_id: parseInt(id) })
      .in("id", userIds);

    if (error) {
      console.error("Assign users error:", error);
      return res.status(500).json({ error: "Failed to assign users" });
    }

    addLog("INFO", "Accounts", `Assigned ${userIds.length} users to account ${id}`);
    res.json({ message: "Users assigned successfully" });
  } catch (error) {
    console.error("Assign users error:", error);
    res.status(500).json({ error: "Failed to assign users" });
  }
});

// Remove user from account
app.delete("/api/accounts/:id/users/:userId", sessionMiddleware, async (req, res) => {
  try {
    const { id, userId } = req.params;

    const { error } = await supabase
      .from("users")
      .update({ account_id: null })
      .eq("id", userId)
      .eq("account_id", id);

    if (error) {
      console.error("Remove user error:", error);
      return res.status(500).json({ error: "Failed to remove user" });
    }

    addLog("INFO", "Accounts", `Removed user ${userId} from account ${id}`);
    res.json({ message: "User removed from account" });
  } catch (error) {
    console.error("Remove user error:", error);
    res.status(500).json({ error: "Failed to remove user" });
  }
});

// Assign channels to account
app.post("/api/accounts/:id/channels", sessionMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { channelIds, accessLevel = 'read_write' } = req.body;

    if (!channelIds || !Array.isArray(channelIds)) {
      return res.status(400).json({ error: "channelIds array is required" });
    }

    // Insert channel assignments
    const assignments = channelIds.map(channelId => ({
      account_id: parseInt(id),
      channel_id: channelId,
      access_level: accessLevel,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from("account_channels")
      .upsert(assignments, { onConflict: 'account_id,channel_id' });

    if (error) {
      console.error("Assign channels error:", error);
      return res.status(500).json({ error: "Failed to assign channels" });
    }

    // Sync with Stream - add all account users to these channels
    if (streamServerClient) {
      try {
        const { data: accountUsers } = await supabase
          .from("users")
          .select("stream_id")
          .eq("account_id", id);

        const streamUserIds = (accountUsers || [])
          .map(u => u.stream_id)
          .filter(id => id != null);

        for (const channelId of channelIds) {
          if (streamUserIds.length > 0) {
            await streamServerClient.addChannelMembers(
              `team:${channelId}`,
              streamUserIds
            );
          }
        }
        addLog("INFO", "Stream", `Synced ${channelIds.length} channels with account ${id} users`);
      } catch (streamError) {
        console.warn("Stream sync warning:", streamError.message);
        addLog("WARN", "Stream", `Could not sync channels with Stream`, streamError.message);
      }
    }

    addLog("INFO", "Accounts", `Assigned ${channelIds.length} channels to account ${id}`);
    res.json({ message: "Channels assigned successfully" });
  } catch (error) {
    console.error("Assign channels error:", error);
    res.status(500).json({ error: "Failed to assign channels" });
  }
});

// Remove channel from account
app.delete("/api/accounts/:id/channels/:channelId", sessionMiddleware, async (req, res) => {
  try {
    const { id, channelId } = req.params;

    const { error } = await supabase
      .from("account_channels")
      .delete()
      .eq("account_id", id)
      .eq("channel_id", channelId);

    if (error) {
      console.error("Remove channel error:", error);
      return res.status(500).json({ error: "Failed to remove channel" });
    }

    addLog("INFO", "Accounts", `Removed channel ${channelId} from account ${id}`);
    res.json({ message: "Channel removed from account" });
  } catch (error) {
    console.error("Remove channel error:", error);
    res.status(500).json({ error: "Failed to remove channel" });
  }
});

// Get effective channels for account (including inherited from parents)
app.get("/api/accounts/:id/effective-channels", sessionMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Get account and all ancestors
    const getAncestors = async (accountId, ancestors = []) => {
      const { data: account } = await supabase
        .from("accounts")
        .select("id, name, parent_account_id")
        .eq("id", accountId)
        .single();

      if (account) {
        ancestors.push(account);
        if (account.parent_account_id) {
          await getAncestors(account.parent_account_id, ancestors);
        }
      }
      return ancestors;
    };

    const ancestors = await getAncestors(parseInt(id));
    const accountIds = ancestors.map(a => a.id);

    // Get all channels assigned to this account and ancestors
    const { data: channelAssignments } = await supabase
      .from("account_channels")
      .select("*")
      .in("account_id", accountIds);

    // Mark inherited channels
    const effectiveChannels = (channelAssignments || []).map(ch => ({
      ...ch,
      inherited: ch.account_id !== parseInt(id),
      inheritedFrom: ch.account_id !== parseInt(id) 
        ? ancestors.find(a => a.id === ch.account_id)?.name 
        : null
    }));

    res.json(effectiveChannels);
  } catch (error) {
    console.error("Get effective channels error:", error);
    res.status(500).json({ error: "Failed to get effective channels" });
  }
});

// Get all available channels (from groups)
app.get("/api/channels", sessionMiddleware, async (req, res) => {
  try {
    // Get channels from groups
    const { data: groups } = await supabase
      .from("groups")
      .select("id, name, description");

    // Get channels from emergency groups
    const { data: emergencyGroups } = await supabase
      .from("emergency_groups")
      .select("id, name, description");

    const channels = [
      ...(groups || []).map(g => ({ 
        id: `group-${g.id}`, 
        name: g.name, 
        description: g.description,
        type: 'group' 
      })),
      ...(emergencyGroups || []).map(g => ({ 
        id: `emergency-${g.id}`, 
        name: g.name, 
        description: g.description,
        type: 'emergency' 
      }))
    ];

    res.json(channels);
  } catch (error) {
    console.error("Get channels error:", error);
    res.status(500).json({ error: "Failed to get channels" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    supabase: process.env.SUPABASE_URL ? "configured" : "not-configured",
  });
});

// Comprehensive database tables check
app.get("/api/db-check", async (req, res) => {
  try {
    const tables = {};
    const checkTable = async (tableName, selectFields = "id") => {
      const { data, error, count } = await supabase
        .from(tableName)
        .select(selectFields, { count: 'exact', head: false })
        .limit(1);
      if (error) {
        return { exists: false, error: error.message, code: error.code };
      }
      return { exists: true, accessible: true };
    };

    // Get actual row counts for each table
    const getCount = async (tableName) => {
      const { count, error } = await supabase
        .from(tableName)
        .select("*", { count: 'exact', head: true });
      return error ? 0 : count;
    };

    // Core user management
    const usersCheck = await checkTable("users", "id, email, name, role, account_id, stream_id");
    tables.users = { ...usersCheck, rows: await getCount("users") };

    // Groups and messaging
    const groupsCheck = await checkTable("groups", "id, name, description");
    tables.groups = { ...groupsCheck, rows: await getCount("groups") };

    const groupMembersCheck = await checkTable("group_members", "id, group_id, user_id");
    tables.group_members = { ...groupMembersCheck, rows: await getCount("group_members") };

    // Emergency groups
    const emergencyGroupsCheck = await checkTable("emergency_groups", "id, name, description");
    tables.emergency_groups = { ...emergencyGroupsCheck, rows: await getCount("emergency_groups") };

    const emergencyMembersCheck = await checkTable("emergency_group_members", "id, emergency_group_id, user_id");
    tables.emergency_group_members = { ...emergencyMembersCheck, rows: await getCount("emergency_group_members") };

    // Accounts hierarchy
    const accountsCheck = await checkTable("accounts", "id, name, parent_account_id");
    tables.accounts = { ...accountsCheck, rows: await getCount("accounts") };

    const accountChannelsCheck = await checkTable("account_channels", "id, account_id, channel_id");
    tables.account_channels = { ...accountChannelsCheck, rows: await getCount("account_channels") };

    // Calculate summary
    const allTables = Object.values(tables);
    const existingTables = allTables.filter(t => t.exists).length;
    const missingTables = allTables.filter(t => !t.exists);

    res.json({ 
      status: missingTables.length === 0 ? "ok" : "incomplete",
      supabase_url: process.env.SUPABASE_URL ? "configured" : "missing",
      summary: {
        total_tables: allTables.length,
        existing: existingTables,
        missing: missingTables.length,
        missing_tables: missingTables.length > 0 ? Object.keys(tables).filter(k => !tables[k].exists) : []
      },
      tables 
    });
  } catch (error) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✓ Hybrid API & CMS server running on port ${PORT}`);
  console.log(
    `✓ Supabase: ${process.env.SUPABASE_URL ? "Configured" : "Missing"}`,
  );
  console.log(`✓ Brevo Email: ${process.env.BREVO_API_KEY ? "Configured" : "Missing"}`);
  console.log(`✓ API & CMS available at http://localhost:${PORT}`);
});

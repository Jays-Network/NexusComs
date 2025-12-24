const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const https = require("https");
const rateLimit = require("express-rate-limit");
const { Expo } = require("expo-server-sdk");

const cometchat = require("./utils/cometchat");
const securityRoutes = require("./routes/security");
const { securityMonitor } = require("./middleware/securityMonitor");
const { exec } = require("child_process");
const { addSecurityAlert } = require("./utils/alerts");
const fs = require("fs");

const { createAuthController } = require("./controllers/authController");
const { createUserController } = require("./controllers/userController");
const { createGroupController } = require("./controllers/groupController");
const { createEmergencyController } = require("./controllers/emergencyController");
const { createLocationController } = require("./controllers/locationController");
const { createAccountController } = require("./controllers/accountController");
const { createServiceController } = require("./controllers/serviceController");

const { createAuthRoutes } = require("./routes/auth");
const { createUserRoutes } = require("./routes/users");
const { createGroupRoutes } = require("./routes/groups");
const { createEmergencyRoutes } = require("./routes/emergency");
const { createLocationRoutes } = require("./routes/location");
const { createAccountRoutes } = require("./routes/accounts");
const { createServiceRoutes } = require("./routes/services");

dotenv.config();

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
    
    if (auditData.metadata && auditData.metadata.vulnerabilities) {
      return auditData.metadata.vulnerabilities;
    } else if (auditData.vulnerabilities) {
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
        writeAuditLog(scope, counts, stdout.substring(0, 5000));
        resolve({ scope, counts, success: true });
      } else {
        resolve({ scope, counts: { critical: 0, high: 0, moderate: 0, low: 0 }, success: false });
      }
    });
  });
};

const runStartupSecurityAudit = async () => {
  console.log("[SECURITY] Running automated dependency audit...");
  
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
        console.log("[SECURITY] Run 'cd backend && npm audit fix' to address vulnerabilities");
      }
    } else {
      console.log("[SECURITY] No vulnerabilities found in backend dependencies");
    }
  } else {
    console.log("[SECURITY] Backend audit check completed (no vulnerabilities or npm audit unavailable)");
  }
};

setTimeout(runStartupSecurityAudit, 3000);

if (cometchat.isConfigured()) {
  console.log("CometChat configured - App ID:", cometchat.COMETCHAT_APP_ID);
  console.log("CometChat Region:", cometchat.COMETCHAT_REGION);
} else {
  console.error("CometChat not fully configured - check COMETCHAT_APP_ID, COMETCHAT_API_KEY, COMETCHAT_AUTH_KEY");
}

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(
  process.env.SUPABASE_URL,
  supabaseKey,
);

console.log(`Supabase using ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service role' : 'anon'} key`);

let systemLogsTableExists = false;
(async () => {
  try {
    const { data, error } = await supabase.from('system_logs').select('id').limit(1);
    if (error && error.message.includes('Could not find the table')) {
      console.error('system_logs table not found in Supabase!');
      console.error('   Please create it by running this SQL in your Supabase SQL Editor:');
      console.error('   CREATE TABLE IF NOT EXISTS system_logs (');
      console.error('     id SERIAL PRIMARY KEY,');
      console.error('     action VARCHAR(255) NOT NULL,');
      console.error('     details TEXT,');
      console.error('     user_id VARCHAR(255),');
      console.error('     user_email VARCHAR(255),');
      console.error('     ip_address VARCHAR(45),');
      console.error('     timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),');
      console.error('     metadata JSONB');
      console.error('   );');
      console.error('   ALTER TABLE system_logs DISABLE ROW LEVEL SECURITY;');
    } else if (error) {
      console.error('Error checking system_logs table:', error.message);
    } else {
      systemLogsTableExists = true;
      console.log('system_logs table verified');
    }
  } catch (e) {
    console.error('Error verifying system_logs table:', e.message);
  }
})();

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

if (process.env.BREVO_API_KEY) {
  console.log("Brevo API Key configured - Ready to send emails");
} else {
  console.error("BREVO_API_KEY not set - Password reset emails will NOT be sent");
}

const expo = new Expo();

const sendExpoPushNotifications = async (pushTokens, title, body, data = {}) => {
  const messages = [];
  
  for (const pushToken of pushTokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.warn(`[PUSH] Invalid Expo push token: ${pushToken}`);
      continue;
    }
    
    messages.push({
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      priority: 'high',
      channelId: data.type === 'emergency' ? 'emergency' : 'default',
    });
  }
  
  if (messages.length === 0) {
    return { success: false, error: 'No valid push tokens' };
  }
  
  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    
    console.log(`[PUSH] Sent ${tickets.length} notifications`);
    return { success: true, tickets };
  } catch (error) {
    console.error('[PUSH] Error sending notifications:', error);
    return { success: false, error: error.message };
  }
};

const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : ['http://localhost:8081', 'http://localhost:3000', 'https://localhost:8081'];

app.use(cors({
  origin: function(origin, callback) {
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

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
});
app.use('/api/', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  handler: (req, res, next, options) => {
    addSecurityAlert('rate_limit', `Auth rate limit exceeded for IP: ${req.ip}`, 'medium');
    res.status(429).json(options.message);
  }
});
app.use('/api/auth/', authLimiter);

app.use(securityMonitor);

app.use(express.static(path.join(__dirname, '../public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));

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

const adminOnlyMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const permissions = req.user.permissions || {};
  const billingPlan = (req.user.billing_plan || '').toLowerCase();
  
  const isAdmin = permissions.admin === true || 
                  permissions.superAdmin === true || 
                  req.user.role === 'admin' ||
                  billingPlan === 'executive' ||
                  permissions.can_access_cms === true ||
                  permissions.can_allocate_permissions === true;
  
  if (req.method === 'GET') {
    return next();
  }
  
  if (!isAdmin) {
    addSecurityAlert('unauthorized_access', `Non-admin user ${req.user.email || req.user.id} attempted security write operation`, 'medium');
    return res.status(403).json({ error: "Admin access required for this operation" });
  }
  
  next();
};

let systemLogs = [];
const MAX_LOGS = 1000;

function addLog(level, source, message, details = null, userInfo = null, ipAddress = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    details,
    user: userInfo ? (userInfo.email || userInfo.username || userInfo.id) : null,
  };
  systemLogs.unshift(logEntry);
  if (systemLogs.length > MAX_LOGS) {
    systemLogs.pop();
  }
  console.log(`[${level}] ${source}: ${message}`);
  
  if (supabase && systemLogsTableExists) {
    supabase.from('system_logs').insert({
      action: source,
      details: details || null,
      user_id: userInfo ? (userInfo.id || userInfo.username) : null,
      user_email: userInfo ? userInfo.email : null,
      ip_address: ipAddress,
      timestamp: logEntry.timestamp,
      metadata: { level, source, message }
    }).then(({ error }) => {
      if (error) {
        console.error('Failed to persist log to Supabase:', error.message);
      }
    }).catch(err => {
      console.error('Supabase log persistence error:', err.message);
    });
  }
}

const authController = createAuthController(supabase, cometchat, sendBrevoEmail, addLog);
const userController = createUserController(supabase, addLog);
const groupController = createGroupController(supabase, cometchat, addLog);
const emergencyController = createEmergencyController(supabase, cometchat, sendExpoPushNotifications, addLog);
const locationController = createLocationController(supabase, addLog);
const accountController = createAccountController(supabase, addLog);
const serviceController = createServiceController(supabase, cometchat, addLog, systemLogs, systemLogsTableExists);

app.use('/api/security', sessionMiddleware, adminOnlyMiddleware, securityRoutes);
app.use('/api/auth', createAuthRoutes(authController, authLimiter));
app.use('/api/users', createUserRoutes(userController, sessionMiddleware));
app.use('/api/groups', createGroupRoutes(groupController, sessionMiddleware));
app.use('/api/emergency', createEmergencyRoutes(emergencyController, sessionMiddleware));
app.use('/api/location', createLocationRoutes(locationController, sessionMiddleware));
app.use('/api/accounts', createAccountRoutes(accountController, sessionMiddleware));

// Location update route for mobile app - matches /api/users/:userId/location
app.post('/api/users/:id/location', sessionMiddleware, locationController.updateLocation);

app.get("/api/services/status", serviceController.getServicesStatus);
app.get("/api/billing-plans", serviceController.getBillingPlans);
app.get("/api/billing-plans/:plan", serviceController.getBillingPlan);
app.get("/api/billing-plans/:plan/can-access/:feature", serviceController.checkPlanAccess);
app.get("/api/logs", sessionMiddleware, serviceController.getLogs);
app.delete("/api/logs", sessionMiddleware, serviceController.clearLogs);
app.post("/api/push/register", sessionMiddleware, serviceController.registerPushToken);
app.get("/health", serviceController.getHealth);
app.get("/", serviceController.getRoot);

app.get("/api/emergency-groups", sessionMiddleware, emergencyController.getAllEmergencyGroups);
app.post("/api/emergency-groups", sessionMiddleware, emergencyController.createEmergencyGroup);

// Global error handler - ensures all errors return JSON
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message || err);
  addLog("ERROR", "Server", "Unhandled server error", err.message || String(err));
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Hybrid API & CMS server running on port ${PORT}`);
  console.log(`Supabase: ${process.env.SUPABASE_URL ? "Configured" : "Missing"}`);
  console.log(`Brevo Email: ${process.env.BREVO_API_KEY ? "Configured" : "Missing"}`);
  console.log(`API & CMS available at http://localhost:${PORT}`);
  
  addLog("INFO", "Server", "Server started successfully", JSON.stringify({
    port: PORT,
    supabase: process.env.SUPABASE_URL ? "configured" : "missing",
    cometchat: cometchat.isConfigured() ? "configured" : "missing",
    brevo: process.env.BREVO_API_KEY ? "configured" : "missing",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  }));
  
  setTimeout(() => {
    if (supabase && supabaseKey && systemLogsTableExists) {
      supabase.from('system_logs').insert({
        action: 'Server',
        details: 'Startup database test',
        timestamp: new Date().toISOString(),
        metadata: { level: 'INFO', source: 'Server', message: 'Database persistence verified' }
      }).then(({ data, error }) => {
        if (error) {
          console.error('Startup database test failed:', error.message);
        } else {
          console.log('Database persistence verified');
        }
      }).catch(err => {
        console.error('Startup database test exception:', err.message);
      });
    } else if (supabase && supabaseKey && !systemLogsTableExists) {
      console.log('Skipping database persistence test - system_logs table not available');
    }
  }, 2000);
});

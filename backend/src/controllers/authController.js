const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const verificationCodes = new Map();

const createAuthController = (supabase, cometchat, sendBrevoEmail, addLog) => {
  
  const sendCode = async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email required" });
      }

      const normalizedEmail = email.toLowerCase();

      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, email, username")
        .ilike("email", normalizedEmail)
        .single();

      if (userError || !users) {
        return res.status(400).json({ error: "Email not found" });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;

      verificationCodes.set(normalizedEmail, { code, expiresAt, attempts: 0 });

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
  };

  const verifyCode = async (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ error: "Email and code required" });
      }

      const normalizedEmail = email.toLowerCase();
      const stored = verificationCodes.get(normalizedEmail);
      
      if (!stored) {
        return res.status(400).json({ error: "No code sent for this email. Request a new one." });
      }

      if (Date.now() > stored.expiresAt) {
        verificationCodes.delete(normalizedEmail);
        return res.status(400).json({ error: "Code expired. Request a new one." });
      }

      if (stored.attempts >= 5) {
        verificationCodes.delete(normalizedEmail);
        return res.status(400).json({ error: "Too many attempts. Request a new code." });
      }

      if (code !== stored.code) {
        stored.attempts++;
        return res.status(400).json({ error: "Invalid code" });
      }

      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, email, username, billing_plan, permissions, role")
        .ilike("email", normalizedEmail)
        .single();

      if (userError || !users) {
        return res.status(401).json({ error: "User not found" });
      }

      const token = jwt.sign(
        { 
          id: users.id, 
          email: users.email, 
          username: users.username,
          billing_plan: users.billing_plan || 'basic',
          permissions: users.permissions || {},
          role: users.role || 'user'
        },
        process.env.SESSION_SECRET,
        { expiresIn: "7d" },
      );

      await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", users.id);

      verificationCodes.delete(normalizedEmail);

      res.json({
        token,
        user: { id: users.id, email: users.email, username: users.username, billing_plan: users.billing_plan },
      });
    } catch (error) {
      console.error("Verify code error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  };

  const login = async (req, res) => {
    try {
      console.log("🔐 [LOGIN] Received login request");
      const { username, email, password, device_info } = req.body;
      const loginIdentifier = username || email;
      console.log("📝 [LOGIN] Identifier:", loginIdentifier);
      console.log("📱 [LOGIN] Device info:", device_info);

      if (!loginIdentifier || !password) {
        console.warn("⚠️ [LOGIN] Missing username/email or password");
        return res.status(400).json({ error: "Username and password required" });
      }

      console.log("🔍 [LOGIN] Querying Supabase for user:", loginIdentifier);
      let query = supabase
        .from("users")
        .select("id, email, password_hash, username, billing_plan, permissions, role");
      
      if (loginIdentifier.includes('@')) {
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

      console.log("🔑 [LOGIN] Verifying password for user:", username);
      const passwordMatch = await bcrypt.compare(password, users.password_hash);
      if (!passwordMatch) {
        console.warn("⚠️ [LOGIN] Invalid password for user:", username);
        addLog("WARN", "Backend", "Login attempt - Invalid password", username);
        return res.status(401).json({ error: "Invalid credentials" });
      }

      console.log("🎫 [LOGIN] Generating session token for user:", username);
      console.log("📋 [LOGIN] User billing_plan:", users.billing_plan);
      const token = jwt.sign(
        { 
          id: users.id, 
          email: users.email, 
          username: users.username,
          billing_plan: users.billing_plan || 'basic',
          permissions: users.permissions || {},
          role: users.role || 'user'
        },
        process.env.SESSION_SECRET,
        { expiresIn: "7d" },
      );

      const updateData = { 
        last_login: new Date().toISOString() 
      };
      
      if (device_info) {
        updateData.last_device = typeof device_info === 'string' ? device_info : JSON.stringify(device_info);
        console.log("📱 [LOGIN] Updating last_device:", updateData.last_device);
      }
      
      await supabase
        .from("users")
        .update(updateData)
        .eq("id", users.id);

      console.log("✅ [LOGIN] Successful login for user:", username, "billing_plan:", users.billing_plan);
      addLog("INFO", "Backend", "User logged in successfully", username);
      
      res.json({
        token,
        user: { id: users.id, email: users.email, username: users.username, billing_plan: users.billing_plan },
      });
    } catch (error) {
      console.error("❌ [LOGIN] Unexpected error:", error);
      addLog("ERROR", "Backend", "Login endpoint error", error instanceof Error ? error.message : String(error));
      res.status(500).json({ error: "Login failed" });
    }
  };

  const changePassword = async (req, res) => {
    try {
      const { userId, currentPassword, newPassword } = req.body;

      if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ error: "All fields are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, password_hash")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        return res.status(404).json({ error: "User not found" });
      }

      const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      
      const { error: updateError } = await supabase
        .from("users")
        .update({ password_hash: newPasswordHash })
        .eq("id", userId);

      if (updateError) {
        return res.status(500).json({ error: "Failed to update password" });
      }

      addLog("INFO", "Backend", "Password changed", `User ${userId}`);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  };

  const forgotPassword = async (req, res) => {
    try {
      const { identifier } = req.body;

      if (!identifier) {
        return res.status(400).json({ error: "Email or username is required" });
      }

      let query = supabase.from("users").select("id, email, username");
      
      if (identifier.includes('@')) {
        query = query.ilike("email", identifier.toLowerCase());
      } else {
        query = query.eq("username", identifier);
      }

      const { data: user, error: userError } = await query.single();

      if (userError || !user) {
        return res.json({ message: "If that account exists, a reset link will be sent." });
      }

      const resetToken = Math.random().toString(36).slice(-16) + Date.now().toString(36);
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      await supabase
        .from("users")
        .update({ 
          reset_token: resetToken,
          reset_token_expires: resetExpires
        })
        .eq("id", user.id);

      try {
        const resetUrl = `${process.env.APP_URL || 'https://NexusComs.replit.app'}/reset-password.html?token=${resetToken}`;
        
        const emailHtml = `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your NexusComs account.</p>
          <p><strong>This link expires in 1 hour.</strong></p>
          <p>
            <a href="${resetUrl}" 
               style="display: inline-block; padding: 12px 24px; background: #D4AF37; color: #1a1a1a; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Reset Password
            </a>
          </p>
          <p>If you didn't request this, please ignore this email.</p>
          <p><small>Or copy this link: ${resetUrl}</small></p>
        `;

        await sendBrevoEmail(user.email, "NexusComs Password Reset", emailHtml);
        addLog("INFO", "Backend", "Password reset email sent", user.email);
      } catch (emailError) {
        console.error("Failed to send reset email:", emailError);
      }

      res.json({ message: "If that account exists, a reset link will be sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  };

  const resetPassword = async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, email, reset_token_expires")
        .eq("reset_token", token)
        .single();

      if (userError || !user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      if (new Date(user.reset_token_expires) < new Date()) {
        return res.status(400).json({ error: "Reset token has expired" });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      const { error: updateError } = await supabase
        .from("users")
        .update({ 
          password_hash: newPasswordHash,
          reset_token: null,
          reset_token_expires: null
        })
        .eq("id", user.id);

      if (updateError) {
        return res.status(500).json({ error: "Failed to reset password" });
      }

      addLog("INFO", "Backend", "Password reset completed", user.email);
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  };

  const getCometChatToken = async (req, res) => {
    try {
      const { userId, userName, userImage } = req.body;

      if (!userId || !userName) {
        return res
          .status(400)
          .json({ error: "userId and userName are required" });
      }

      const sanitizedUserId = cometchat.sanitizeUid(userId);
      console.log(`[CometChat] Generating token for user: ${sanitizedUserId}`);

      if (!cometchat.isConfigured()) {
        console.error("[CometChat] Not configured");
        return res.status(500).json({ 
          error: "CometChat not configured - check COMETCHAT_APP_ID, COMETCHAT_API_KEY, COMETCHAT_AUTH_KEY" 
        });
      }

      try {
        await cometchat.createUser(sanitizedUserId, userName, userImage);
        console.log(`[CometChat] User created/updated: ${sanitizedUserId}`);
      } catch (userError) {
        console.warn(`[CometChat] User creation warning: ${userError.message}`);
      }

      const authToken = await cometchat.createAuthToken(sanitizedUserId);
      console.log(`[CometChat] Auth token generated for: ${sanitizedUserId}`);

      try {
        await supabase
          .from("users")
          .update({ cometchat_uid: sanitizedUserId })
          .ilike("email", userId);
      } catch (dbError) {
        console.warn(`[CometChat] Could not update user cometchat_uid: ${dbError.message}`);
      }

      res.json({
        authToken: authToken,
        userId: sanitizedUserId,
        appId: cometchat.COMETCHAT_APP_ID,
        region: cometchat.COMETCHAT_REGION,
        authKey: cometchat.COMETCHAT_AUTH_KEY,
      });
    } catch (error) {
      console.error("CometChat token error:", error);
      res.status(500).json({ error: "Failed to generate token: " + error.message });
    }
  };

  const getStreamToken = async (req, res) => {
    console.log("[Legacy] Stream token endpoint called, redirecting to CometChat");
    
    const { userId, userName, userImage } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({ error: "userId and userName are required" });
    }

    try {
      const sanitizedUserId = cometchat.sanitizeUid(userId);
      
      if (!cometchat.isConfigured()) {
        return res.status(500).json({ error: "Chat service not configured" });
      }

      await cometchat.createUser(sanitizedUserId, userName, userImage);
      const authToken = await cometchat.createAuthToken(sanitizedUserId);

      res.json({
        token: authToken,
        userId: sanitizedUserId,
        apiKey: cometchat.COMETCHAT_APP_ID,
        appId: cometchat.COMETCHAT_APP_ID,
        region: cometchat.COMETCHAT_REGION,
        authKey: cometchat.COMETCHAT_AUTH_KEY,
      });
    } catch (error) {
      console.error("Legacy token error:", error);
      res.status(500).json({ error: "Failed to generate token: " + error.message });
    }
  };

  return {
    sendCode,
    verifyCode,
    login,
    changePassword,
    forgotPassword,
    resetPassword,
    getCometChatToken,
    getStreamToken
  };
};

module.exports = { createAuthController };

const express = require("express");
const router = express.Router();

const createAuthRoutes = (authController, authLimiter) => {
  router.post("/send-code", authLimiter, authController.sendCode);
  router.post("/verify-code", authLimiter, authController.verifyCode);
  router.post("/login", authLimiter, authController.login);
  router.post("/change-password", authLimiter, authController.changePassword);
  router.post("/forgot-password", authLimiter, authController.forgotPassword);
  router.post("/reset-password", authLimiter, authController.resetPassword);
  router.post("/cometchat-token", authController.getCometChatToken);
  router.post("/stream-token", authController.getStreamToken);
  
  return router;
};

module.exports = { createAuthRoutes };

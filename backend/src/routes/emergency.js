const express = require("express");
const router = express.Router();

const createEmergencyRoutes = (emergencyController, sessionMiddleware) => {
  router.get("/groups", sessionMiddleware, emergencyController.getAllEmergencyGroups);
  router.post("/groups", sessionMiddleware, emergencyController.createEmergencyGroup);
  router.post("/trigger", sessionMiddleware, emergencyController.triggerEmergency);
  router.get("/active", sessionMiddleware, emergencyController.getActiveEmergencies);
  router.post("/:id/resolve", sessionMiddleware, emergencyController.resolveEmergency);
  
  return router;
};

module.exports = { createEmergencyRoutes };

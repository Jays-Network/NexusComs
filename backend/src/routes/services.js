const express = require("express");
const router = express.Router();

const createServiceRoutes = (serviceController, sessionMiddleware) => {
  router.get("/status", serviceController.getServicesStatus);
  router.get("/billing-plans", serviceController.getBillingPlans);
  router.get("/billing-plans/:plan", serviceController.getBillingPlan);
  router.get("/billing-plans/:plan/can-access/:feature", serviceController.checkPlanAccess);
  router.get("/logs", sessionMiddleware, serviceController.getLogs);
  router.delete("/logs", sessionMiddleware, serviceController.clearLogs);
  router.post("/push/register", sessionMiddleware, serviceController.registerPushToken);
  router.get("/health", serviceController.getHealth);
  
  return router;
};

module.exports = { createServiceRoutes };

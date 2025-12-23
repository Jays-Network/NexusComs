const express = require("express");
const router = express.Router();

const createUserRoutes = (userController, sessionMiddleware) => {
  router.get("/", sessionMiddleware, userController.getAllUsers);
  router.get("/available", sessionMiddleware, userController.getAvailableUsers);
  router.get("/tracked", sessionMiddleware, userController.getTrackedUsers);
  router.post("/:id/location-tracking", sessionMiddleware, userController.updateLocationTracking);
  router.get("/:id", sessionMiddleware, userController.getUserById);
  router.post("/", sessionMiddleware, userController.createUser);
  router.put("/:id", sessionMiddleware, userController.updateUser);
  router.delete("/:id", sessionMiddleware, userController.deleteUser);
  
  return router;
};

module.exports = { createUserRoutes };

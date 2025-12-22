const express = require("express");
const router = express.Router();

const createLocationRoutes = (locationController, sessionMiddleware) => {
  router.post("/update", sessionMiddleware, locationController.updateLocation);
  router.get("/group/:groupId", sessionMiddleware, locationController.getGroupLocations);
  
  return router;
};

module.exports = { createLocationRoutes };

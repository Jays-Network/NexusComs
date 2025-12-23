const express = require("express");
const router = express.Router();

const createGroupRoutes = (groupController, sessionMiddleware) => {
  router.get("/", sessionMiddleware, groupController.getAllGroups);
  router.get("/:groupId", sessionMiddleware, groupController.getGroupById);
  router.post("/", sessionMiddleware, groupController.createGroup);
  router.put("/:groupId", sessionMiddleware, groupController.updateGroup);
  router.delete("/:groupId", sessionMiddleware, groupController.deleteGroup);
  
  return router;
};

module.exports = { createGroupRoutes };

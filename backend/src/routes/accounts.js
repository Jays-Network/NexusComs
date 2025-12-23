const express = require("express");
const router = express.Router();

const createAccountRoutes = (accountController, sessionMiddleware) => {
  router.get("/", sessionMiddleware, accountController.getAllAccounts);
  router.get("/:id", sessionMiddleware, accountController.getAccountById);
  router.post("/", sessionMiddleware, accountController.createAccount);
  router.put("/:id", sessionMiddleware, accountController.updateAccount);
  router.delete("/:id", sessionMiddleware, accountController.deleteAccount);
  router.post("/:id/users", sessionMiddleware, accountController.assignUsers);
  router.delete("/:id/users/:userId", sessionMiddleware, accountController.removeUser);
  
  return router;
};

module.exports = { createAccountRoutes };

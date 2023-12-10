const express = require("express");
const {
  register,
  login,
  getCurrent,
  logout,
  changeSubscription,
  updateAvatarURL,
} = require("../../controlers/auth");
const { validateBody, authenticate, upload } = require("../../middlewares");
const schema = require("../../schemas/user");

const router = express.Router();

router.post("/register", validateBody(schema.registerSchema), register);
router.post("/login", validateBody(schema.registerSchema), login);
router.get("/current", authenticate, getCurrent);
router.post("/logout", authenticate, logout);
router.patch(
  "/",
  authenticate,
  validateBody(schema.subscriptionSchema),
  changeSubscription
);
router.patch(
  "/avatars",
  authenticate,
  upload.single("avatar"),
  updateAvatarURL
);

module.exports = router;

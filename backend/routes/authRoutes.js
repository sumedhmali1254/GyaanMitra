const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadsDirectory = path.resolve(__dirname, "..", "uploads");
fs.mkdirSync(uploadsDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDirectory,
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

const upload = multer({ storage }).single("avatar");

const {
  registerUser,
  loginUser,
  guestLogin,
  getMe,
  updateProfile,
  logoutUser,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const {
  registerValidator,
  loginValidator,
} = require("../validators/authValidator");

router.post("/register", registerValidator, upload, registerUser);

router.post("/login", loginValidator, loginUser);
router.post("/guest", guestLogin);
router.post("/logout", logoutUser);
router.get("/me", protect, getMe);
router.put("/profile", protect, upload, updateProfile);

module.exports = router;

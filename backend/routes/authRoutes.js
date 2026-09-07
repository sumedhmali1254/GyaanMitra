const express = require("express");
const router = express.Router();

const multer = require("multer");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
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

const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const { protect } = require("../middleware/authMiddleware");

// All stats routes are protected
router.use(protect);

router.post("/", sessionController.createSession);
router.get("/stats", sessionController.getStats);

module.exports = router;

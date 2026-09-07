const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const multer = require("multer");

const { protect } = require("../middleware/authMiddleware");

// All routes are protected and user-specific
router.use(protect);

// Multer v2 middleware - handle upload inline to catch errors
router.post("/extract-syllabus", async (req, res, next) => {
  try {
    const upload = multer({ storage: multer.memoryStorage() });
    // In multer v2, .single() returns a middleware that might be async
    const middleware = upload.single("file");
    
    // Check if middleware returns a promise (multer v2) or uses callback (multer v1)
    const result = middleware(req, res, (err) => {
      if (err) {
        console.error("[Multer Error]", err);
        return res.status(400).json({ success: false, message: "File upload failed: " + err.message });
      }
      // Continue to the actual handler after multer processes the file
      settingsController.extractSyllabus(req, res);
    });
    
    // If multer v2 returns a promise, await it
    if (result && typeof result.then === 'function') {
      await result;
      // For multer v2 promise-based, file should be on req now
      if (!res.headersSent) {
        settingsController.extractSyllabus(req, res);
      }
    }
  } catch (error) {
    console.error("[Upload Route Error]", error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Upload processing failed: " + error.message });
    }
  }
});

router.get("/", settingsController.getSettings);
router.post("/", settingsController.updateSettings);

module.exports = router;

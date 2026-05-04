const express = require("express");
const router = express.Router();
const { getFlashcards, generateFlashcards } = require("../controllers/flashcardController");
const { protect } = require("../middleware/authMiddleware");

router.get("/", protect, getFlashcards);
router.post("/generate", protect, generateFlashcards);
router.post("/generate-all", protect, require("../controllers/flashcardController").generateAllFlashcards);

module.exports = router;

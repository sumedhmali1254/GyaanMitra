const express = require("express");
const router = express.Router();
const quizController = require("../controllers/quizController");
const quizResultController = require("../controllers/quizResultController");
const { protect } = require("../middleware/authMiddleware");

// All quiz routes are protected
router.use(protect);

router.post("/generate", quizController.generateQuiz);
router.post("/result", quizResultController.saveQuizResult);
router.get("/stats", quizResultController.getQuizStats);
router.delete("/result/:id", quizResultController.deleteQuizResult);

module.exports = router;

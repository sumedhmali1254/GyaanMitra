const { QuizResult } = require("../models");

// @desc    Record a completed quiz result
// @route   POST /api/quiz/result
// @access  Private
exports.saveQuizResult = async (req, res) => {
  try {
    const { courseTitle, score, totalQuestions, difficulty } = req.body;
    
    if (!courseTitle || score === undefined || !totalQuestions) {
      return res.status(400).json({ success: false, message: "Missing required quiz data" });
    }

    const accuracy = parseFloat(((score / totalQuestions) * 100).toFixed(1));

    const result = await QuizResult.create({
      userId: req.user.id,
      courseTitle,
      score,
      totalQuestions,
      accuracy,
      difficulty: difficulty || "medium",
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error saving quiz result", error: error.message });
  }
};

// @desc    Get user quiz performance stats
// @route   GET /api/quiz/stats
// @access  Private
exports.getQuizStats = async (req, res) => {
  try {
    const results = await QuizResult.findAll({
      where: { userId: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 100
    });
    
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching quiz stats", error: error.message });
  }
};

const { QuizResult } = require("../models");

// @desc    Record a completed quiz result
// @route   POST /api/quiz/result
// @access  Private
exports.saveQuizResult = async (req, res) => {
  try {
    const {
      courseTitle,
      score,
      totalQuestions,
      difficulty,
      questions,
      selectedAnswers,
    } = req.body;

    if (!courseTitle || score === undefined || !totalQuestions) {
      return res.status(400).json({ success: false, message: "Missing required quiz data" });
    }
    if (
      (questions !== undefined && !Array.isArray(questions)) ||
      (selectedAnswers !== undefined &&
        (!selectedAnswers || typeof selectedAnswers !== "object" || Array.isArray(selectedAnswers)))
    ) {
      return res.status(400).json({
        success: false,
        message: "Quiz review details have an invalid format.",
      });
    }

    const accuracy = parseFloat(((score / totalQuestions) * 100).toFixed(1));

    const result = await QuizResult.create({
      userId: req.user.id,
      courseTitle,
      score,
      totalQuestions,
      accuracy,
      difficulty: difficulty || "medium",
      questions: questions || null,
      selectedAnswers: selectedAnswers || null,
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

// @desc    Delete a completed quiz result
// @route   DELETE /api/quiz/result/:id
// @access  Private
exports.deleteQuizResult = async (req, res) => {
  try {
    const deletedCount = await QuizResult.destroy({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!deletedCount) {
      return res.status(404).json({
        success: false,
        message: "Quiz result not found.",
      });
    }

    return res.json({ success: true, message: "Quiz result deleted." });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting quiz result",
      error: error.message,
    });
  }
};

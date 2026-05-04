const { StudySession } = require("../models");

// @desc    Record a completed study session
// @route   POST /api/sessions
// @access  Private
exports.createSession = async (req, res) => {
  try {
    const { duration, mode, startTime, endTime, status } = req.body;
    
    const session = await StudySession.create({
      userId: req.user.id,
      duration,
      mode,
      startTime,
      endTime,
      status: status || "completed"
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error recording session", error: error.message });
  }
};

// @desc    Get user study statistics (past 7 days)
// @route   GET /api/sessions/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const sessions = await StudySession.findAll({
      where: { userId: req.user.id },
      order: [['startTime', 'DESC']],
      limit: 50 // Get last 50 sessions for history
    });
    
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching stats", error: error.message });
  }
};

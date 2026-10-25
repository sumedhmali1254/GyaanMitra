const { StudySession } = require("../models");
const { Op } = require("sequelize");

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

// @desc    Get all focus sessions for user study statistics
// @route   GET /api/sessions/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const sessions = await StudySession.findAll({
      where: {
        userId: req.user.id,
        mode: { [Op.notIn]: ["break", "short_break", "long_break"] },
      },
      order: [['startTime', 'DESC']],
    });
    
    res.json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching stats", error: error.message });
  }
};

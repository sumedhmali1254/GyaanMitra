const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const db = require("../models");
const router = express.Router();

const { PlannerSubject, PlannerSession, PlannerRecommendation } = db;

// --- SUBJECTS ---

// Get all planner subjects for the logged-in user
router.get("/subjects", protect, async (req, res) => {
  try {
    const subjects = await PlannerSubject.findAll({
      where: { userId: req.user.id },
    });
    res.json(subjects);
  } catch (error) {
    console.error("Error fetching planner subjects:", error);
    res.status(500).json({ error: "Failed to fetch planner subjects" });
  }
});

// Add a single subject
router.post("/subjects", protect, async (req, res) => {
  try {
    const newSubject = await PlannerSubject.create({
      ...req.body,
      userId: req.user.id,
    });
    res.status(201).json(newSubject);
  } catch (error) {
    console.error("Error adding planner subject:", error);
    res.status(500).json({ error: "Failed to add planner subject" });
  }
});

// Update a single subject
router.put("/subjects/:id", protect, async (req, res) => {
  try {
    const [updatedCount] = await PlannerSubject.update(req.body, {
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (updatedCount > 0) {
      const updatedSubject = await PlannerSubject.findOne({
        where: { id: req.params.id, userId: req.user.id },
      });
      res.json(updatedSubject);
    } else {
      res.status(404).json({ error: "Subject not found" });
    }
  } catch (error) {
    console.error("Error updating planner subject:", error);
    res.status(500).json({ error: "Failed to update planner subject" });
  }
});

// Delete a single subject
router.delete("/subjects/:id", protect, async (req, res) => {
  try {
    await PlannerSubject.destroy({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting planner subject:", error);
    res.status(500).json({ error: "Failed to delete planner subject" });
  }
});

// --- SESSIONS (TIMETABLE) ---

// Get all planner sessions for user
router.get("/sessions", protect, async (req, res) => {
  try {
    const sessions = await PlannerSession.findAll({
      where: { userId: req.user.id },
    });
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching planner sessions:", error);
    res.status(500).json({ error: "Failed to fetch planner sessions" });
  }
});

// Clear all existing sessions for user and save the new bulk array
// We use a single bulk post so the timetable generation simply replaces the old one.
router.post("/sessions/bulk", protect, async (req, res) => {
  try {
    const { sessions } = req.body;
    
    // Clear old ones
    await PlannerSession.destroy({
      where: { userId: req.user.id },
    });

    // Validations: If sessions exist, insert them.
    if (sessions && sessions.length > 0) {
      const recordsToInsert = sessions.map((s) => ({
        ...s,
        userId: req.user.id,
      }));
      await PlannerSession.bulkCreate(recordsToInsert);
    }
    
    res.status(201).json({ success: true, message: "Timetable updated" });
  } catch (error) {
    console.error("Error saving bulk planner sessions:", error);
    res.status(500).json({ error: "Failed to save planner sessions" });
  }
});

// Update a single session (e.g. toggle completed)
router.put("/sessions/:id", protect, async (req, res) => {
  try {
    const [updatedCount] = await PlannerSession.update(req.body, {
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (updatedCount > 0) {
      const updatedSession = await PlannerSession.findOne({
        where: { id: req.params.id, userId: req.user.id },
      });
      res.json(updatedSession);
    } else {
      res.status(404).json({ error: "Session not found" });
    }
  } catch (error) {
    console.error("Error updating planner session:", error);
    res.status(500).json({ error: "Failed to update planner session" });
  }
});

// Clear entirely
router.delete("/sessions", protect, async (req, res) => {
  try {
    await PlannerSession.destroy({
      where: { userId: req.user.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Error clearing planner sessions:", error);
    res.status(500).json({ error: "Failed to clear planner sessions" });
  }
});

// --- RECOMMENDATIONS ---

// Get all AI recommendations for user
router.get("/recommendations", protect, async (req, res) => {
  try {
    const recommendations = await PlannerRecommendation.findAll({
      where: { userId: req.user.id },
    });
    res.json(recommendations);
  } catch (error) {
    console.error("Error fetching planner recommendations:", error);
    res.status(500).json({ error: "Failed to fetch planner recommendations" });
  }
});

// Clear all existing recommendations for user and save the new bulk array
router.post("/recommendations/bulk", protect, async (req, res) => {
  try {
    const { recommendations } = req.body;
    
    // Clear old ones
    await PlannerRecommendation.destroy({
      where: { userId: req.user.id },
    });

    // If recommendations exist, insert them.
    if (recommendations && recommendations.length > 0) {
      const recordsToInsert = recommendations.map((r) => ({
        ...r,
        userId: req.user.id,
      }));
      await PlannerRecommendation.bulkCreate(recordsToInsert);
    }
    
    res.status(201).json({ success: true, message: "Recommendations updated" });
  } catch (error) {
    console.error("Error saving bulk planner recommendations:", error);
    res.status(500).json({ error: "Failed to save planner recommendations" });
  }
});

module.exports = router;

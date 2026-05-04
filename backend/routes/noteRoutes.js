const express = require("express");
const router = express.Router();
const { getNotes, createNote, updateNote, deleteNote } = require("../controllers/noteController");
const { protect } = require("../middleware/authMiddleware");

// All routes are protected and user-specific
router.use(protect);

router.route("/")
  .get(getNotes)
  .post(createNote);

router.route("/:id")
  .put(updateNote)
  .delete(deleteNote);

module.exports = router;

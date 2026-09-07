const { Note } = require("../models");

// @desc    Get all notes for current user
// @route   GET /api/notes
// @access  Private
exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, count: notes.length, data: notes });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching notes", error: error.message });
  }
};

// @desc    Create new note
// @route   POST /api/notes
// @access  Private
exports.createNote = async (req, res) => {
  try {
    const { text, category } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, message: "Please add note text" });
    }

    const note = await Note.create({
      text,
      category: category || "study",
      userId: req.user.id
    });

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating note", error: error.message });
  }
};

// @desc    Update note (toggle done, pin, or edit text)
// @route   PUT /api/notes/:id
// @access  Private
exports.updateNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, category, done, pinned } = req.body;

    const note = await Note.findOne({ where: { id, userId: req.user.id } });

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    // Only update fields provided in the body
    if (text !== undefined) note.text = text;
    if (category !== undefined) note.category = category;
    if (done !== undefined) note.done = done;
    if (pinned !== undefined) note.pinned = pinned;

    await note.save();

    res.json({ success: true, data: note });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating note", error: error.message });
  }
};

// @desc    Delete note
// @route   DELETE /api/notes/:id
// @access  Private
exports.deleteNote = async (req, res) => {
  try {
    const { id } = req.params;
    const note = await Note.findOne({ where: { id, userId: req.user.id } });

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    await note.destroy();

    res.json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting note", error: error.message });
  }
};

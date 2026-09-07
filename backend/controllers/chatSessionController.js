const { ChatSession } = require("../models");

exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await ChatSession.findAll({
      where: { userId: req.user.id },
      order: [["updatedAt", "DESC"]],
    });
    return res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
};

exports.createSession = async (req, res, next) => {
  try {
    const { title, messages } = req.body;
    
    // We only create this session if it has a real message.
    const newSession = await ChatSession.create({
      title: title || "New Chat",
      messages: messages || [],
      userId: req.user.id,
    });

    return res.status(201).json({ success: true, data: newSession });
  } catch (error) {
    next(error);
  }
};

exports.updateSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, messages } = req.body;

    const session = await ChatSession.findOne({ where: { id, userId: req.user.id } });
    if (!session) {
      return res.status(404).json({ success: false, message: "Chat session not found" });
    }

    if (title !== undefined) session.title = title;
    if (messages !== undefined) session.messages = messages;

    await session.save();
    return res.status(200).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

exports.deleteSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await ChatSession.findOne({ where: { id, userId: req.user.id } });
    if (!session) {
      return res.status(404).json({ success: false, message: "Chat session not found" });
    }

    await session.destroy();
    return res.status(200).json({ success: true, message: "Chat session deleted" });
  } catch (error) {
    next(error);
  }
};

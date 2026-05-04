const express = require("express");
const { getSessions, createSession, updateSession, deleteSession } = require("../controllers/chatSessionController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").get(getSessions).post(createSession);
router.route("/:id").put(updateSession).delete(deleteSession);

module.exports = router;

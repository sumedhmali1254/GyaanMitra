const express = require("express");
const {
    generateQuiz,
    generateFlashcardsBulk,
    chatWithAi,
} = require("./ai.controller");

// Auth middleware
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Health check for LM Studio connection (no auth needed)
router.get("/ai-health", async (req, res) => {
    const rawURL = process.env.LM_STUDIO_URL || "http://127.0.0.1:1254";
    const baseURL = rawURL.replace(/\/v1\/?$/, "");
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${baseURL}/v1/models`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) {
            const data = await response.json();
            const modelNames = (data.data || []).map(m => m.id);
            return res.json({ connected: true, models: modelNames });
        }
        return res.json({ connected: false, error: "LM Studio responded with error" });
    } catch (err) {
        return res.json({ connected: false, error: "LM Studio is not reachable" });
    }
});

router.post("/quiz/generate-ai", protect, generateQuiz);
router.post("/flashcards/generate-all-ai", protect, generateFlashcardsBulk);
router.post("/chat", protect, chatWithAi);

module.exports = router;
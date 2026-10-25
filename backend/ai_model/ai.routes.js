const express = require("express");
const {
    generateQuiz,
    generateFlashcardsBulk,
    chatWithAi,
} = require("./ai.controller");
const { fetchLmStudioModels, getLmStudioChatModel } = require("./lmStudio");

// Auth middleware
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Health check for LM Studio connection (no auth needed)
router.get("/ai-health", async (req, res) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const models = await fetchLmStudioModels({ signal: controller.signal });
        const modelNames = models
            .map((model) => model.id)
            .filter((modelId) => typeof modelId === "string");

        try {
            getLmStudioChatModel(models);
            return res.json({ connected: true, models: modelNames });
        } catch (error) {
            return res.json({
                connected: false,
                models: modelNames,
                error: error.message,
            });
        }
    } catch (err) {
        console.error("[LM Studio Health] Connection check failed:", err.message);
        return res.json({ connected: false, error: err.message });
    } finally {
        clearTimeout(timeout);
    }
});

router.post("/quiz/generate-ai", protect, generateQuiz);
router.post("/flashcards/generate-all-ai", protect, generateFlashcardsBulk);
router.post("/chat", protect, chatWithAi);

module.exports = router;
const crypto = require("crypto");
const { generateAiContent } = require("../ai_model/ai.service");

// In-memory cache (TTL: 1 Hour)
const quizCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Validate quiz structure
 */
const isValidQuizArray = (quiz) => {
  return (
    Array.isArray(quiz) &&
    quiz.length > 0 &&
    quiz.every((item) => {
      return (
        item &&
        typeof item.question === "string" &&
        item.question.trim().length > 0 &&
        Array.isArray(item.options) &&
        item.options.length === 4 &&
        item.options.every((opt) => typeof opt === "string" && opt.trim().length > 0) &&
        typeof item.correctAnswer === "string" &&
        item.options.includes(item.correctAnswer) &&
        typeof item.explanation === "string" &&
        item.explanation.trim().length > 0 &&
        typeof item.chapterSource === "string" &&
        item.chapterSource.trim().length > 0
      );
    })
  );
};

/**
 * Prompt for Gemini
 * Gemini can return JSON array directly
 */
const formatGeminiQuizPrompt = (
  courseTitle,
  modules,
  topics,
  difficulty,
  numQuestions
) => {
  return `Act as an expert educator.

Generate exactly ${numQuestions} high-quality academic multiple choice questions (MCQs) for the course: "${courseTitle}".

Syllabus Context:
- Chapters: ${Array.isArray(modules) ? modules.join(", ") : modules}
- Focus Topics: ${Array.isArray(topics) ? topics.join(", ") : topics}
- Difficulty: ${difficulty || "medium"}

Return ONLY a valid JSON array in this exact format:
[
  {
    "question": "Clear, concise question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "The exact string from the correct option",
    "explanation": "One sentence reasoning",
    "chapterSource": "Chapter name this relates to"
  }
]

Rules:
- Exactly ${numQuestions} questions
- Exactly 4 options per question
- correctAnswer must exactly match one of the 4 options
- No markdown
- No code block
- No introductory text
- Only the JSON array`;
};

/**
 * MAIN: Quiz Generation with Cache + Failover
 */
exports.generateQuiz = async (req, res) => {
  try {
    let {
      courseTitle,
      moduleNames,
      topics,
      difficulty,
      numQuestions,
      timeLimit,
    } = req.body;

    // 0. Input normalization
    if (typeof moduleNames === "string") {
      moduleNames = moduleNames
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    if (typeof topics === "string") {
      topics = topics
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    console.log("[QuizGenerator] Incoming payload:", {
      courseTitle,
      moduleNames,
      topics,
      difficulty,
      numQuestions,
      timeLimit,
    });

    // 1. Strict Input Validation
    if (typeof courseTitle !== "string" || !courseTitle.trim()) {
      return res.status(400).json({
        success: false,
        message: "Course title (courseTitle) must not be empty.",
      });
    }

    if (!Array.isArray(moduleNames) || moduleNames.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Module names (moduleNames) must be a non-empty array.",
      });
    }

    if (!Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Topics must be a non-empty array.",
      });
    }

    const nQuestions = parseInt(numQuestions, 10);

    if (isNaN(nQuestions) || nQuestions < 1 || nQuestions > 20) {
      return res.status(400).json({
        success: false,
        message: "Number of questions (numQuestions) must be between 1 and 20.",
      });
    }

    // 2. Cache Check
    const cacheInput = JSON.stringify({
      courseTitle: courseTitle.trim(),
      moduleNames,
      topics,
      difficulty: difficulty || "medium",
      numQuestions: nQuestions,
      timeLimit,
    });

    const cacheKey = crypto
      .createHash("sha256")
      .update(cacheInput)
      .digest("hex");

    const cachedEntry = quizCache.get(cacheKey);

    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL) {
      console.log(`[QuizCache] HIT for ${courseTitle}`);
      return res.status(200).json({
        success: true,
        quiz: cachedEntry.data,
        cached: true,
      });
    }

    // 3. AI Generation via Unified Service
    try {
      const prompt = formatGeminiQuizPrompt(
        courseTitle,
        moduleNames,
        topics,
        difficulty,
        nQuestions
      );

      const { text, provider, modelId } = await generateAiContent(prompt, { json: true });
      
      const parsed = JSON.parse(text);
      let quizArray = parsed;

      // OpenAI might return it wrapped in "quiz" key based on the formatOpenAIQuizPrompt
      if (parsed.quiz && Array.isArray(parsed.quiz)) {
        quizArray = parsed.quiz;
      }

      if (!isValidQuizArray(quizArray)) {
        throw new Error(`AI returned invalid quiz structure from ${provider} (${modelId})`);
      }

      console.log(`[QuizGenerator] SUCCESS using ${provider} (${modelId})`);

      quizCache.set(cacheKey, {
        data: quizArray,
        timestamp: Date.now(),
      });

      return res.status(200).json({
        success: true,
        quiz: quizArray,
        provider,
        model: modelId,
      });

    } catch (err) {
      console.error(`[QuizGenerator] AI Generation failed: ${err.message}`);
      return res.status(502).json({
        success: false,
        message: "All AI providers failed. Check your API keys, quotas, or model names.",
        details: err.message || "No providers succeeded.",
      });
    }
  } catch (err) {
    console.error("[QuizGenerator] Internal Server Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error while generating quiz.",
      details: err.message,
    });
  }
};
const pdfParse = require("pdf-parse");
const OpenAI = require("openai");

exports.extractSyllabus = async (req, res) => {
  try {
    console.log(
      "[Extract] Request received, file:",
      req.file ? `${req.file.originalname} (${req.file.size} bytes)` : "NONE",
    );

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No PDF file uploaded" });
    }

    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "PDF file is empty" });
    }

    // 1. Extract raw text from the uploaded PDF
    console.log(
      "[Extract] Parsing PDF buffer of",
      req.file.buffer.length,
      "bytes...",
    );
    const data = await pdfParse(req.file.buffer);
    const pdfText = data.text;
    console.log("[Extract] Extracted", pdfText.length, "characters of text");

    if (!pdfText || pdfText.trim() === "") {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Could not extract text from the PDF. The PDF may be image-based or empty.",
        });
    }

    // 2. Setup LM Studio Client
    // Ensure the base URL always ends with /v1 for OpenAI compatibility
    let lmStudioBase = process.env.LM_STUDIO_URL || "http://127.0.0.1:1283";
    if (!lmStudioBase.endsWith("/v1")) {
      lmStudioBase = lmStudioBase.replace(/\/+$/, "") + "/v1";
    }

    const openai = new OpenAI({
      baseURL: lmStudioBase,
      apiKey: "lm-studio", // LM Studio doesn't strictly require an API key, but the SDK requires a string
    });

    // We take the first 12,000 characters to prevent overflowing local LM studio context limits
    const textSnippet = pdfText.substring(0, 12000);

    const prompt = `You are a strict Syllabus Extractor AI.
Read the following academic syllabus text and extract:
1. The overall Subject / Course Title
2. All Chapters (or Modules/Units) with their number and name
3. For each chapter, extract ALL theory topics mentioned — including sub-topics, concepts, definitions, theorems, and any detailed content listed under that chapter

Output EXACTLY a valid JSON object with the following structure. DO NOT output any markdown (like \`\`\`json), any explanation, or any text before/after the JSON. Just the raw JSON object:
{
  "courseTitle": "The Name of the Subject",
  "chapters": [
    { "id": 1, "name": "Full Name of Chapter or Module 1", "topics": "Detailed, comma, separated, list, of, all, theory, topics, and, sub-topics, in, this, chapter" },
    { "id": 2, "name": "Full Name of Chapter or Module 2", "topics": "All, topics, listed, under, this, chapter" }
  ]
}

Rules:
- Extract EVERY chapter/module/unit mentioned in the syllabus
- For topics, include ALL items: theory concepts, sub-topics, theorems, laws, definitions, experiments, etc.
- Keep the courseTitle as the exact subject name from the PDF
- Do NOT skip any chapter or topic

Syllabus Text:
${textSnippet}
`;

    console.log(
      `[LM Studio] Sending ${textSnippet.length} chars of PDF text to ${lmStudioBase} for extraction...`,
    );

    // 3. Ask LM Studio to process the PDF
    const completion = await openai.chat.completions.create({
      model: "qwen2.5-coder-7b-instruct", // This model name doesn't matter much for LM Studio, it uses whatever is loaded
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1, // Keep it low for strict, deterministic JSON formatting
    });

    let rawOutput = completion.choices[0].message.content.trim();

    // Clean up any potential markdown wrapper if the model hallucinates it
    // Remove ```json ... ``` or ``` ... ``` wrappers
    rawOutput = rawOutput
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    // Try to find JSON object in the output if there's extra text around it
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawOutput = jsonMatch[0];
    }

    // 4. Parse the LLM's intelligent extraction
    let extractedData;
    try {
      extractedData = JSON.parse(rawOutput);
    } catch (parseError) {
      console.error(
        "[LM Studio] Failed to parse JSON output:",
        rawOutput.substring(0, 500),
      );
      return res.status(500).json({
        success: false,
        message:
          "LM Studio returned invalid JSON. Please try again or use a different model.",
        error: parseError.message,
      });
    }

    // Fallback guarantees just in case the JSON lacks these fields
    if (!extractedData.courseTitle)
      extractedData.courseTitle = "Extracted Course";
    if (!extractedData.chapters) extractedData.chapters = [];

    // Map IDs to guarantee proper indexing for the frontend Flashcards Engine
    extractedData.chapters = extractedData.chapters.map((ch, idx) => ({
      id: idx + 1,
      name: ch.name || `Chapter ${idx + 1}`,
      topics: ch.topics || "General Concepts",
    }));

    console.log(
      `[LM Studio Extractor] Successfully parsed "${extractedData.courseTitle}" with ${extractedData.chapters.length} chapters.`,
    );

    res.json({ success: true, data: extractedData });
  } catch (error) {
    console.error(
      "Error extracting syllabus via LM Studio:",
      error.message || error,
    );

    // Provide specific error messages
    if (error.code === "ECONNREFUSED") {
      return res.status(500).json({
        success: false,
        message:
          "Cannot connect to LM Studio. Make sure LM Studio is running with a model loaded and the server is started.",
        error: error.message,
      });
    }

    if (error instanceof SyntaxError) {
      return res.status(500).json({
        success: false,
        message: "LM Studio failed to format the syllabus as JSON. Try again.",
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: "LM Studio is either not running or failed to process the PDF.",
      error: error.message,
    });
  }
};

const { User } = require("../models");

// @desc    Get user settings
// @route   GET /api/settings
// @access  Private
exports.getSettings = async (req, res) => {
  try {
    if (req.user.isGuest) {
      return res.json({
        success: true,
        data: {
          syllabusData: [],
          preferredFlashcardSource: "pdf",
          timer: { focusDuration: 25, breakDuration: 5, autoStart: false },
          music: { lastVibe: "lofi", volume: 50 },
        },
      });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: user.settings || {} });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching settings",
        error: error.message,
      });
  }
};

// @desc    Update user settings
// @route   POST /api/settings
// @access  Private
exports.updateSettings = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Merge existing settings with new updates
    const currentSettings = user.settings || {};
    user.settings = { ...currentSettings, ...req.body };

    await user.save();

    res.json({ success: true, data: user.settings });
  } catch (error) {
    res
      .status(500)
      .json({
        success: false,
        message: "Error updating settings",
        error: error.message,
      });
  }
};

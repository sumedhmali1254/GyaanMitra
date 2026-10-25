const { generateAiContent } = require("./ai.service");
const { parseAiJson } = require("../utils/parseAiJson");
const Flashcard = require("../models/flashcard");

const buildQuizPrompt = ({
    subject,
    topic,
    difficulty = "medium",
    count = 5,
}) => `
You are an educational quiz generator.

Generate ${count} multiple choice questions.

Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}

Rules:
- Return ONLY valid JSON
- Do not include markdown
- Do not include explanation outside JSON
- Each question must have exactly 4 options
- answer must match one of the options

Format:
[
  {
    "question": "string",
    "options": ["string", "string", "string", "string"],
    "answer": "string",
    "explanation": "string"
  }
]
`;

const buildFlashcardPrompt = ({ subject, topic, count = 8 }) => `
You are an educational flashcard generator.

Generate ${count} flashcards.

Subject: ${subject}
Topic: ${topic}

Rules:
- Return ONLY valid JSON
- Do not include markdown
- Keep answers clear and short

Format:
[
  {
    "front": "string",
    "back": "string"
  }
]
`;

const validateQuiz = (data) => {
    if (!Array.isArray(data)) {
        throw new Error("Quiz must be an array");
    }

    for (const item of data) {
        if (
            !item.question ||
            !Array.isArray(item.options) ||
            item.options.length !== 4 ||
            !item.answer
        ) {
            throw new Error("Invalid quiz format");
        }
    }

    return data;
};

const validateFlashcards = (data) => {
    if (!Array.isArray(data)) {
        throw new Error("Flashcards must be an array");
    }

    for (const item of data) {
        if (!item.front || !item.back) {
            throw new Error("Invalid flashcard format");
        }
    }

    return data;
};

const generateQuiz = async (req, res) => {
    try {
        const { courseTitle, moduleNames, topics, difficulty, numQuestions } = req.body;

        if (!courseTitle || !moduleNames || !topics) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields (courseTitle, moduleNames, or topics)",
            });
        }

        const prompt = buildQuizPrompt({
            subject: courseTitle,
            topic: Array.isArray(topics) ? topics.join(", ") : topics,
            difficulty,
            count: numQuestions || 5,
        });

        const { text, provider, modelId } = await generateAiContent(prompt, { json: true });
        console.log(`[AI Controller] Quiz generated using ${provider} (${modelId})`);

        const parsed = parseAiJson(text);
        const quiz = validateQuiz(parsed);

        return res.status(200).json({
            success: true,
            message: "Quiz generated successfully",
            quiz: quiz,
            provider,
            model: modelId
        });
    } catch (error) {
        console.error("Quiz generation error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to generate quiz",
            error: error.message,
        });
    }
};

const generateFlashcardsBulk = async (req, res) => {
    try {
        const { source, syllabusData, count, force } = req.body;
        const userId = req.user.id;

        if (!syllabusData || !Array.isArray(syllabusData)) {
            return res.status(400).json({ success: false, message: "Invalid syllabus data" });
        }
        if (!["all", "pdf", "manual"].includes(source)) {
            return res.status(400).json({ success: false, message: "Invalid flashcard source" });
        }

        const cardsPerChapter = Number.parseInt(count, 10);
        if (!Number.isInteger(cardsPerChapter) || cardsPerChapter < 1 || cardsPerChapter > 50) {
            return res.status(400).json({ success: false, message: "Cards per chapter must be between 1 and 50" });
        }

        let chaptersProcessed = 0;
        let chaptersSkipped = 0;
        let chaptersFailed = 0;
        let cardsCreated = 0;
        const errors = [];

        // Helper: small delay between AI calls to avoid overwhelming LM Studio
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        for (const course of syllabusData) {
            if (source !== "all" && course.source !== source) continue;

            if (!course.chapters || !Array.isArray(course.chapters)) continue;

            for (const chapter of course.chapters) {
                // Skip chapters with no name or topics
                if (typeof chapter.name !== "string" || !chapter.name.trim() ||
                    !(typeof chapter.topics === "string" ? chapter.topics.trim() : chapter.topics)) {
                    console.log(`[Flashcard] Skipping empty chapter in ${course.courseTitle}`);
                    chaptersSkipped++;
                    continue;
                }

                try {
                    const existingCards = await Flashcard.findAll({
                        where: {
                            userId,
                            subject: course.courseTitle,
                            chapter: chapter.name,
                            source: course.source,
                        },
                        attributes: ["id", "question"],
                    });
                    const cardsNeeded = force
                        ? cardsPerChapter
                        : Math.max(0, cardsPerChapter - existingCards.length);

                    if (cardsNeeded === 0) {
                        console.log(`[Flashcard] Skipping ${chapter.name} (${existingCards.length} cards already meet the requested count)`);
                        chaptersSkipped++;
                        continue;
                    }

                    console.log(`[Flashcard] Generating for: ${course.courseTitle} > ${chapter.name}`);

                    const generatedCards = [];
                    const knownQuestions = new Set(
                        (force ? [] : existingCards)
                            .map((card) => card.question.trim().toLocaleLowerCase()),
                    );
                    const maxAttempts = 3;

                    for (let attempt = 0; attempt < maxAttempts && generatedCards.length < cardsNeeded; attempt++) {
                        const remaining = cardsNeeded - generatedCards.length;
                        const prompt = `${buildFlashcardPrompt({
                            subject: course.courseTitle,
                            topic: chapter.topics,
                            count: remaining,
                        })}

Chapter: ${chapter.name}
Return exactly ${remaining} unique cards. Do not repeat these existing questions:
${Array.from(knownQuestions).map((question) => `- ${question}`).join("\n") || "- None"}

Use JSON objects with "front" and "back" fields.`;

                        const { text } = await generateAiContent(prompt, { json: true });
                        const parsed = parseAiJson(text);
                        if (!Array.isArray(parsed)) {
                            throw new Error("AI response must be a JSON array");
                        }

                        for (const item of parsed) {
                            const front = item.front ?? item.question;
                            const back = item.back ?? item.answer;
                            if (typeof front !== "string" || !front.trim() ||
                                typeof back !== "string" || !back.trim()) {
                                continue;
                            }
                            const normalizedQuestion = front.trim().toLocaleLowerCase();
                            if (knownQuestions.has(normalizedQuestion)) continue;
                            knownQuestions.add(normalizedQuestion);
                            generatedCards.push({ front: front.trim(), back: back.trim() });
                            if (generatedCards.length === cardsNeeded) break;
                        }

                        if (generatedCards.length < cardsNeeded && attempt < maxAttempts - 1) {
                            await delay(500);
                        }
                    }

                    if (generatedCards.length < cardsNeeded && force) {
                        throw new Error(`AI returned ${generatedCards.length} of ${cardsNeeded} requested cards after ${maxAttempts} attempts; existing cards were preserved.`);
                    }

                    if (force) {
                        await Flashcard.destroy({
                            where: {
                                userId,
                                subject: course.courseTitle,
                                chapter: chapter.name,
                                source: course.source,
                            }
                        });
                    }

                    const cardsToSave = generatedCards.slice(0, cardsNeeded);
                    await Promise.all(cardsToSave.map((card) => Flashcard.create({
                        question: card.front,
                        answer: card.back,
                        subject: course.courseTitle,
                        chapter: chapter.name,
                        topic: chapter.topics || "General",
                        source: course.source,
                        userId
                    })));

                    chaptersProcessed++;
                    cardsCreated += cardsToSave.length;
                    console.log(`[Flashcard] ✓ Created ${cardsToSave.length} cards for ${chapter.name}`);

                    if (generatedCards.length < cardsNeeded) {
                        chaptersFailed++;
                        errors.push(`${course.courseTitle} > ${chapter.name}: Generated ${generatedCards.length} of ${cardsNeeded} missing cards after ${maxAttempts} attempts.`);
                    }

                    // Small delay to let LM Studio breathe between chapters
                    await delay(1000);

                } catch (chapterError) {
                    chaptersFailed++;
                    const errorMsg = `${course.courseTitle} > ${chapter.name}: ${chapterError.message}`;
                    errors.push(errorMsg);
                    console.error(`[Flashcard] ✗ Failed: ${errorMsg}`);
                    // Continue with next chapter instead of failing everything
                    await delay(500);
                }
            }
        }

        if (chaptersProcessed === 0 && chaptersFailed > 0) {
            return res.status(200).json({
                success: false,
                message: `All ${chaptersFailed} chapters failed. Check if LM Studio is running.`,
                details: { chaptersProcessed, chaptersSkipped, chaptersFailed, cardsCreated, errors }
            });
        }

        const action = force ? "Regenerated" : "Synced";
        return res.status(200).json({
            success: chaptersFailed === 0,
            message: `${action} ${chaptersProcessed} chapters, created ${cardsCreated} flashcards.${chaptersSkipped > 0 ? ` ${chaptersSkipped} chapters already meet the requested count.` : ''}${chaptersFailed > 0 ? ` ${chaptersFailed} chapters need another attempt.` : ''}`,
            details: { chaptersProcessed, chaptersSkipped, chaptersFailed, cardsCreated, errors }
        });

    } catch (error) {
        console.error("Flashcard bulk generation error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to bulk generate flashcards",
            error: error.message,
        });
    }
};

/**
 * Chat with AI for study-related questions
 */
const chatWithAi = async (req, res) => {
    try {
        const { message, context = {} } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Message is required",
            });
        }

        const systemPrompt = `
You are GyaanMitra, a helpful and knowledgeable AI study companion.
Your primary goal is to assist students with their studies, syllabus questions, and educational concepts.

Study Context:
${context.courseTitle ? `- Current Course: ${context.courseTitle}` : ""}
${context.chapter ? `- Current Chapter: ${context.chapter}` : ""}
${context.topics ? `- Key Topics: ${context.topics}` : ""}

Rules:
- Be encouraging and supportive.
- Provide clear, academic, and accurate explanations.
- If the question is not study-related, gently guide the user back to their studies.
- Use simple language for complex topics.
- Break down multi-step problems.
`;

        const fullPrompt = `${systemPrompt}\n\nUser Question: ${message}`;

        const { text, provider, modelId } = await generateAiContent(fullPrompt, { temperature: 0.8 });

        return res.status(200).json({
            success: true,
            response: text,
            provider,
            model: modelId
        });
    } catch (error) {
        console.error("AI Chat error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to get AI response",
            error: error.message,
        });
    }
};

module.exports = {
    generateQuiz,
    generateFlashcardsBulk,
    chatWithAi,
};
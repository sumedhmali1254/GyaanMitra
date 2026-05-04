const { Flashcard } = require("../models");
const { generateAiContent } = require("../ai_model/ai.service");

exports.getFlashcards = async (req, res) => {
  try {
    const { source } = req.query;
    const where = { userId: req.user.id };
    if (source) where.source = source;

    const flashcards = await Flashcard.findAll({ where });
    res.json({ success: true, flashcards });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching flashcards", error: error.message });
  }
};

exports.generateFlashcards = async (req, res) => {
  try {
    const { subject, chapter, topic, count, chapterContexts } = req.body;
    const userId = req.user.id;

    if (!subject || !chapter || !topic) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // 1. Check if cards already exist for this exact scope
    const existingCards = await Flashcard.findAll({
      where: { userId, subject, chapter, topic }
    });

    if (existingCards.length > 0) {
      console.log(`Returning ${existingCards.length} existing flashcards from DB`);
      return res.json({ success: true, flashcards: existingCards, source: 'database' });
    }

    // 2. If not, generate with AI
    const promptText = `
Generate ${count || 5} educational flashcards for:
Subject: ${subject}
Chapter: ${chapter}
Topic: ${topic}
Context: ${chapterContexts || ''}

Return ONLY valid JSON array:
[
  {
    "question": "Concise question",
    "answer": "Clear, informative answer"
  }
]
`;

    try {
      const { text, provider, modelId } = await generateAiContent(promptText, { json: true });
      console.log(`[FlashcardGenerator] Generated using ${provider} (${modelId})`);

      let data = text.trim();
      if (data.startsWith('```')) {
        data = data.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      }

      const cards = JSON.parse(data);

      // 3. Save to database
      const savedCards = await Promise.all(
        cards.map(card => Flashcard.create({
          question: card.question,
          answer: card.answer,
          subject,
          chapter,
          topic,
          source: 'pdf',
          userId
        }))
      );

      return res.json({ success: true, flashcards: savedCards, source: 'ai', provider, model: modelId });

    } catch (err) {
      console.error(`[FlashcardGenerator] AI failure:`, err.message);
      return res.status(502).json({ success: false, message: "AI generation failed", error: err.message });
    }

  } catch (error) {
    console.error("Flashcard error:", error);
    res.status(500).json({ success: false, message: "Error generating flashcards", error: error.message });
  }
};

exports.generateAllFlashcards = async (req, res) => {
  try {
    const { source, syllabusData, count, force } = req.body;
    const userId = req.user.id;

    if (!source || !syllabusData) {
      return res.status(400).json({ success: false, message: "Missing source or syllabus data" });
    }

    const cardsPerChapter = parseInt(count) || 5;
    const relevantSubjects = syllabusData.filter(s => s.source === source);
    let chaptersProcessed = 0;
    let chaptersSkipped = 0;

    for (const subject of relevantSubjects) {
      // Process each chapter ONE BY ONE to avoid token limits
      for (let i = 0; i < subject.chapters.length; i++) {
        const chapter = subject.chapters[i];
        const chDisplayName = `Ch ${i + 1}: ${chapter.name}`;
        
        const existingCount = await Flashcard.count({
          where: { userId, subject: subject.courseTitle, chapter: chDisplayName }
        });
        
        if (!force && existingCount > 0) {
          chaptersSkipped++;
          continue;
        }

        console.log(`Generating flashcards for: ${subject.courseTitle} -> ${chDisplayName}`);

        try {
          // If force refresh, delete existing cards for this formatted chapter name FIRST
          if (force) {
            await Flashcard.destroy({ where: { userId, subject: subject.courseTitle, chapter: chDisplayName } });
            console.log(`Deleted existing cards for ${chDisplayName} (Force Refresh)`);
          }

          const promptText = `
          ACT AS AN EDUCATOR.
          SUBJECT: "${subject.courseTitle}"
          CHAPTER: "${chapter.name}"
          KEY TOPICS: ${chapter.topics}
          
          TASK: Generate EXACTLY ${cardsPerChapter} high-quality educational flashcards.
          NOT 1, NOT 2, but exactly ${cardsPerChapter}.
          
          FORMAT: Return ONLY a valid JSON array of objects.
          [
            {"question": "...", "answer": "...", "topic": "..."}
          ]
          
          RULES:
          - Every card must have a unique question.
          - The length of the array MUST be exactly ${cardsPerChapter}.
          - No markdown, no explanations.`;

          const { text, provider, modelId } = await generateAiContent(promptText, { json: true });
          
          let dataStr = text.trim();
          if (dataStr.startsWith('```')) dataStr = dataStr.replace(/^```json\s*/, '').replace(/```$/, '').trim();
          
          let cards;
          try {
            cards = JSON.parse(dataStr);
          } catch (e) {
            console.error(`Malformed AI JSON for ${chDisplayName}:`, dataStr);
            continue; 
          }

          if (!Array.isArray(cards)) continue;

          await Promise.all(cards.map(card => Flashcard.create({
            question: card.question,
            answer: card.answer,
            subject: subject.courseTitle,
            chapter: chDisplayName,
            topic: card.topic || 'Core Concept',
            source: source,
            userId
          })));

          chaptersProcessed++;
          console.log(`Successfully synced ${chDisplayName} using ${provider}`);

        } catch (err) {
          console.error(`AI Failure for ${chDisplayName}:`, err.message);
          // If it's a quota error, we stop everything
          if (err.message?.includes('429') || err.message?.includes('quota')) {
             return res.status(429).json({ 
               success: false, 
               message: "Daily AI Quota Reached. Please try again later.",
               details: { chaptersProcessed, chaptersSkipped, quotaReached: true }
             });
          }
          // For other errors, we just skip this chapter and continue
        }
      }
    }

    res.json({ 
      success: true, 
      message: `Sync complete.`, 
      details: { chaptersProcessed, chaptersSkipped } 
    });

  } catch (error) {
    res.status(500).json({ success: false, message: "Bulk generation failed", error: error.message });
  }
};



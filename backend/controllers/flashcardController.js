const { Flashcard } = require("../models");
const { generateAiContent } = require("../ai_model/ai.service");

exports.getFlashcards = async (req, res) => {
  try {
    const { source } = req.query;
    const where = { userId: req.user.id };
    if (source && source !== "all") where.source = source;

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
      const chaptersToProcess = [];
      
      for (const chapter of subject.chapters) {
        const existingCount = await Flashcard.count({
          where: { userId, subject: subject.courseTitle, chapter: chapter.name }
        });
        
        if (force || existingCount === 0) {
          chaptersToProcess.push(chapter);
        } else {
          chaptersSkipped++;
        }
      }

      if (chaptersToProcess.length === 0) {
        console.log(`Skipping subject "${subject.courseTitle}" - all chapters already indexed.`);
        continue;
      }

      console.log(`Generating for subject "${subject.courseTitle}" (${chaptersToProcess.length} chapters)...`);

      try {
        const chapterListStr = chaptersToProcess.map(ch => `- Chapter: "${ch.name}", Key Topics: ${ch.topics}`).join('\n');
        const promptText = `Subject: "${subject.courseTitle}"
        I need a set of ${cardsPerChapter} educational flashcards for EACH of these chapters.
        
        ${chapterListStr}
        
        CRITICAL: Return ONLY a valid JSON object where keys are chapter names:
        {
          "Chapter Name": [{"question": "...", "answer": "...", "topic": "..."}],
          ...
        }
        Do not include markdown or explanations outside the JSON block.`;

        const { text, provider, modelId } = await generateAiContent(promptText, { json: true });
        
        let dataStr = text.trim();
        if (dataStr.startsWith('```')) dataStr = dataStr.replace(/^```json\s*/, '').replace(/```$/, '').trim();
        
        let data;
        try {
          data = JSON.parse(dataStr);
        } catch (e) {
          console.error("Malformed AI JSON:", dataStr);
          continue; 
        }

        const chaptersFound = Object.keys(data);
        if (chaptersFound.length === 0) continue;

        // ATOMIC STEP: Only delete existing ones if we actually got new ones
        if (force) {
           for (const chName of chaptersFound) {
             await Flashcard.destroy({ where: { userId, subject: subject.courseTitle, chapter: chName } });
           }
        }

        for (const chName of chaptersFound) {
          const cards = data[chName];
          if (!Array.isArray(cards)) continue;

          await Promise.all(cards.map(card => Flashcard.create({
            question: card.question,
            answer: card.answer,
            subject: subject.courseTitle,
            chapter: chName,
            topic: card.topic || 'Core Concept',
            source: source,
            userId
          })));
          chaptersProcessed++;
        }
        console.log(`Successfully synced ${chaptersFound.length} chapters for ${subject.courseTitle} using ${provider}`);
      } catch (err) {
        console.error(`AI Failure for ${subject.courseTitle}:`, err.message);
        if (err.message?.includes('429') || err.message?.includes('quota')) {
           return res.status(429).json({ 
             success: false, 
             message: "Daily AI Quota Reached. Please try again later.",
             details: { chaptersProcessed, chaptersSkipped, quotaReached: true }
           });
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


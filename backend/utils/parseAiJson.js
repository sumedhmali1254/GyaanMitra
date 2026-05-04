const parseAiJson = (rawText) => {
    if (!rawText || typeof rawText !== "string") {
        throw new Error("Invalid AI response");
    }

    let cleaned = rawText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch (_) { }

    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
        try {
            return JSON.parse(arrayMatch[0]);
        } catch (_) { }
    }

    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
        try {
            return JSON.parse(objectMatch[0]);
        } catch (_) { }
    }

    throw new Error("AI returned invalid JSON");
};

module.exports = { parseAiJson };
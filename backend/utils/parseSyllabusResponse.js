const extractJsonObject = (text) => {
    const start = text.indexOf("{");
    if (start === -1) {
        throw new Error("The response does not contain a JSON object.");
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < text.length; index += 1) {
        const character = text[index];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (character === "\\") {
                escaped = true;
            } else if (character === '"') {
                inString = false;
            }
            continue;
        }

        if (character === '"') {
            inString = true;
        } else if (character === "{") {
            depth += 1;
        } else if (character === "}") {
            depth -= 1;
            if (depth === 0) {
                return text.slice(start, index + 1);
            }
        }
    }

    throw new Error("The JSON object in the response is incomplete.");
};

const parseSyllabusResponse = (rawResponse) => {
    if (typeof rawResponse !== "string" || !rawResponse.trim()) {
        throw new Error("LM Studio returned an empty syllabus response.");
    }

    let response = rawResponse.replace(/^\uFEFF/, "").trim();
    const fencedJson = response.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fencedJson) {
        response = fencedJson[1].trim();
    }

    let syllabus;
    try {
        syllabus = JSON.parse(extractJsonObject(response));
    } catch (error) {
        throw new Error(`LM Studio returned invalid syllabus JSON: ${error.message}`);
    }

    if (
        !syllabus ||
        typeof syllabus !== "object" ||
        Array.isArray(syllabus) ||
        typeof syllabus.courseTitle !== "string" ||
        !syllabus.courseTitle.trim()
    ) {
        throw new Error('Syllabus JSON must contain a non-empty "courseTitle" string.');
    }

    if (!Array.isArray(syllabus.chapters) || syllabus.chapters.length === 0) {
        throw new Error('Syllabus JSON must contain a non-empty "chapters" array.');
    }

    const chapters = syllabus.chapters.map((chapter, index) => {
        if (
            !chapter ||
            typeof chapter !== "object" ||
            Array.isArray(chapter) ||
            typeof chapter.name !== "string" ||
            !chapter.name.trim()
        ) {
            throw new Error(`Chapter ${index + 1} must contain a non-empty "name" string.`);
        }

        let topics;
        if (typeof chapter.topics === "string") {
            topics = chapter.topics.trim();
        } else if (
            Array.isArray(chapter.topics) &&
            chapter.topics.every((topic) => typeof topic === "string")
        ) {
            topics = chapter.topics.map((topic) => topic.trim()).filter(Boolean).join(", ");
        } else {
            throw new Error(
                `Chapter ${index + 1} "topics" must be a string or an array of strings.`,
            );
        }

        if (!topics) {
            throw new Error(`Chapter ${index + 1} must contain at least one topic.`);
        }

        return {
            id: index + 1,
            name: chapter.name.trim(),
            topics,
        };
    });

    return {
        courseTitle: syllabus.courseTitle.trim(),
        chapters,
    };
};

module.exports = { parseSyllabusResponse };

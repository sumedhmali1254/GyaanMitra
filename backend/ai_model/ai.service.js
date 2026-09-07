const generateAiContent = async (prompt, options = {}) => {
    const { json = false, temperature = 0.7 } = options;

    const rawURL = process.env.LM_STUDIO_URL || "http://127.0.0.1:1254";
    // Strip trailing /v1 if present — we add it ourselves
    const baseURL = rawURL.replace(/\/v1\/?$/, "");

    try {
        console.log(`[AI Service] Sending request to LM Studio at ${baseURL}/v1`);

        const messages = [];
        // Add a system prompt to enforce JSON if required
        if (json) {
            messages.push({
                role: "system",
                content: "You are a helpful assistant. You must always return a valid JSON object or array. Do not include markdown enclosing like ```json. Return ONLY standard JSON text."
            });
        }
        messages.push({ role: "user", content: prompt });

        const response = await fetch(`${baseURL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "qwen",
                messages: messages,
                temperature: temperature,
                stream: false
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`LM Studio API error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        let text = data.choices[0]?.message?.content?.trim();

        if (!text) {
            throw new Error(`Empty response from LM Studio`);
        }

        // Clean up markdown markers if the model incorrectly added them
        if (json) {
            if (text.startsWith('```json')) {
                text = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
            } else if (text.startsWith('```')) {
                text = text.replace(/^```\s*/, '').replace(/```$/, '').trim();
            }
        }

        return {
            text,
            provider: "LM Studio",
            modelId: data.model || "qwen",
        };
    } catch (err) {
        console.error(`[AI Service] Error with LM Studio:`, err.message);
        throw err;
    }
};

module.exports = {
    generateAiContent,
};

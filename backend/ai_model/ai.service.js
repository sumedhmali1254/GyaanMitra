const generateAiContent = async (prompt, options = {}) => {
    const { json = false, temperature = 0.7 } = options;

    const rawURL = process.env.LM_STUDIO_URL || "http://127.0.0.1:1254";
    // Strip trailing /v1 if present — we add it ourselves
    const baseURL = rawURL.replace(/\/v1\/?$/, "");

    try {
        console.log(`[AI Service] Sending request to LM Studio at ${baseURL}/v1`);

        let dynamicModelId = "qwen";
        try {
            const modelsRes = await fetch(`${baseURL}/v1/models`);
            if (modelsRes.ok) {
                const modelsData = await modelsRes.json();
                if (modelsData.data && modelsData.data.length > 0) {
                    // Filter out embedding models — they can't do chat completions
                    const chatModels = modelsData.data.filter(
                        m => !m.id.toLowerCase().includes('embed')
                    );
                    if (chatModels.length > 0) {
                        // Prefer qwen or mistral models (known to be fast & reliable)
                        const preferred = chatModels.find(
                            m => m.id.toLowerCase().includes('qwen') || m.id.toLowerCase().includes('mistral')
                        );
                        dynamicModelId = preferred ? preferred.id : chatModels[0].id;
                    }
                    console.log(`[AI Service] Using model: ${dynamicModelId}`);
                }
            }
        } catch (e) {
            console.warn("[AI Service] Could not fetch models, falling back to qwen");
        }

        const messages = [];
        // Add a system prompt to enforce JSON if required
        if (json) {
            messages.push({
                role: "system",
                content: "You are a helpful assistant. You must always return a valid JSON object or array. Do not include markdown enclosing like ```json. Return ONLY standard JSON text."
            });
        }
        messages.push({ role: "user", content: prompt });

        // Add a 120-second timeout to prevent hanging requests that cause 502 errors
        const fetchController = new AbortController();
        const timeoutId = setTimeout(() => fetchController.abort(), 120000);

        const response = await fetch(`${baseURL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: fetchController.signal,
            body: JSON.stringify({
                model: dynamicModelId,
                messages: messages,
                temperature: temperature,
                stream: false,
                max_tokens: 4096
            })
        });

        clearTimeout(timeoutId);

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
        if (err.name === 'AbortError') {
            console.error(`[AI Service] Request to LM Studio timed out after 120 seconds`);
            throw new Error('LM Studio request timed out. The model may be too slow or overloaded. Try again or use a smaller model.');
        }
        console.error(`[AI Service] Error with LM Studio:`, err.message);
        throw err;
    }
};

module.exports = {
    generateAiContent,
};

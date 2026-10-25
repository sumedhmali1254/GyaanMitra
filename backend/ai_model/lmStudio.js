const getLmStudioBaseUrl = () => {
    const rawURL = (process.env.LM_STUDIO_URL || "http://127.0.0.1:1234").trim();
    const baseURL = rawURL.replace(/\/v1\/?$/i, "").replace(/\/+$/, "");

    let parsedURL;
    try {
        parsedURL = new URL(baseURL);
    } catch {
        throw new Error("LM_STUDIO_URL must be a valid absolute URL.");
    }

    if (parsedURL.protocol !== "http:" && parsedURL.protocol !== "https:") {
        throw new Error("LM_STUDIO_URL must use HTTP or HTTPS.");
    }

    return baseURL;
};

const fetchLmStudioModels = async ({ signal } = {}) => {
    const baseURL = getLmStudioBaseUrl();
    const response = await fetch(`${baseURL}/v1/models`, { signal });

    if (!response.ok) {
        const details = (await response.text()).slice(0, 500);
        throw new Error(`LM Studio models request failed (${response.status}): ${details}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.data)) {
        throw new Error("LM Studio returned an invalid models response.");
    }

    return data.data;
};

const getLmStudioChatModel = (models) => {
    const chatModels = models.filter(
        (model) => typeof model.id === "string" && !/embed/i.test(model.id),
    );
    const configuredModel = process.env.LM_STUDIO_MODEL?.trim();

    if (configuredModel) {
        if (!chatModels.some((model) => model.id === configuredModel)) {
            throw new Error(
                `LM_STUDIO_MODEL "${configuredModel}" is not available. Loaded chat models: ${
                    chatModels.map((model) => model.id).join(", ") || "none"
                }`,
            );
        }
        return configuredModel;
    }

    if (chatModels.length === 0) {
        throw new Error("LM Studio has no chat model loaded. Load a chat model and try again.");
    }

    return chatModels[0].id;
};

const resolveLmStudioChatModel = async (options) => {
    const models = await fetchLmStudioModels(options);
    return {
        models,
        model: getLmStudioChatModel(models),
    };
};

module.exports = {
    fetchLmStudioModels,
    getLmStudioBaseUrl,
    getLmStudioChatModel,
    resolveLmStudioChatModel,
};

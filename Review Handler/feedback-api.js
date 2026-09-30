module.exports = async function handler(request, response) {
    response.setHeader("Cache-Control", "no-store");

    if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        return response.status(405).json({ error: "Method not allowed." });
    }

    const origin = request.headers.origin;
    const host = request.headers.host;
    if (!origin || !host) {
        return response.status(403).json({ error: "Request origin is not allowed." });
    }

    try {
        if (new URL(origin).host.toLowerCase() !== host.toLowerCase()) {
            return response.status(403).json({ error: "Request origin is not allowed." });
        }
    } catch {
        return response.status(403).json({ error: "Request origin is not allowed." });
    }

    let body = request.body;
    if (typeof body === "string") {
        try {
            body = JSON.parse(body);
        } catch {
            return response.status(400).json({ error: "Invalid request body." });
        }
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return response.status(400).json({ error: "Invalid request body." });
    }

    if (typeof body.website === "string" && body.website.trim()) {
        return response.status(200).json({ ok: true });
    }

    const rating = body.rating;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || message.length > 1000) {
        return response.status(400).json({ error: "Enter a rating from 1 to 5 and a message under 1000 characters." });
    }

    const botToken = process.env.DISCORD_BOT_TOKEN;
    const channelId = process.env.DISCORD_FEEDBACK_CHANNEL_ID;
    if (!botToken || !channelId || !/^\d{15,22}$/.test(channelId)) {
        console.error("Feedback delivery is missing valid Discord environment configuration.");
        return response.status(503).json({ error: "Feedback is temporarily unavailable." });
    }

    const fields = [
        { name: "Rating", value: `${"⭐".repeat(rating)} (${rating}/5)`, inline: true },
        { name: "Message", value: message || "No written feedback provided." }
    ];

    try {
        const discordResponse = await fetch(
            `https://discord.com/api/v10/channels/${channelId}/messages`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bot ${botToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    embeds: [{
                        title: "Website Feedback",
                        color: 0xd77a2d,
                        fields,
                        timestamp: new Date().toISOString()
                    }],
                    allowed_mentions: { parse: [] }
                })
            }
        );

        if (!discordResponse.ok) {
            console.error("Discord rejected website feedback with status", discordResponse.status);
            return response.status(502).json({ error: "Feedback could not be delivered. Please try again later." });
        }

        return response.status(200).json({ ok: true });
    } catch (error) {
        console.error("Failed to deliver website feedback:", error.message);
        return response.status(502).json({ error: "Feedback could not be delivered. Please try again later." });
    }
};
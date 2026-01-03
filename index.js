require('dotenv').config();
const express = require('express');
const cors = require('cors');
const requestIp = require('request-ip');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { db } = require('./firebaseConfig');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

app.use(cors());
app.use(express.json());
app.use(requestIp.mw());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

const GUEST_LIMIT = 10;

async function checkGuestLimit(ip) {
    const docRef = db.collection('guest_tracking').doc(ip);
    const doc = await docRef.get();

    if (!doc.exists) {
        await docRef.set({ count: 1, lastActive: new Date() });
        return true;
    } else {
        const data = doc.data();
        if (data.count >= GUEST_LIMIT) {
            return false;
        } else {
            await docRef.update({
                count: data.count + 1,
                lastActive: new Date()
            });
            return true;
        }
    }
}

app.post('/api/simplify', async (req, res) => {
    const { title, content, topic, style, language, detailLevel } = req.body;

    try {
        let lengthInstruction = "Keep it concise (around 40 words).";
        if (detailLevel === "short") {
            lengthInstruction = "Keep it extremely short and punchy (20-30 words max). Focus only on the main point.";
        } else if (detailLevel === "medium") {
            lengthInstruction = "Keep it balanced (50-60 words). Explain clearly but simply.";
        } else if (detailLevel === "detailed" || detailLevel === "long") {
            lengthInstruction = "Keep the explanation detailed (60-80 words). Do NOT shorten the content, just make the language simpler and easier to understand.";
        }

        const prompt = `
            Context: The user is learning about "${topic}".
            Card Title: "${title}"
            Current Explanation: "${content}"
            
            Task: Rewrite the explanation to be:
            1. Much simpler and easier to understand (Like explaining to a 10-year-old).
            2. Use a very simple analogy if possible.
            3. Keep the tone "${style || 'Friendly'}".
            4. Answer in "${language || 'English'}".
            5. **Length Requirement:** ${lengthInstruction}
            6. KEY REQUIREMENT: Use **double asterisks** to highlight **important sentences, key phrases, and complete definitions**.
            
            Output: Just the new simplified explanation text. No intro/outro.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const simplifiedText = response.text().trim();

        res.json({ success: true, newContent: simplifiedText });

    } catch (error) {
        console.error("Simplify Error:", error);
        res.status(500).json({ success: false, message: "Failed to simplify." });
    }
});

// --- GENERATE CONTENT ---
app.post('/api/generate', async (req, res) => {
    try {
        const { topic, language, style, persona, detailLevel, cardLimit, userId } = req.body;
        const clientIp = req.clientIp;

        if (!userId) {
            const isAllowed = await checkGuestLimit(clientIp);
            if (!isAllowed) {
                return res.status(403).json({
                    success: false,
                    errorType: "LIMIT_EXCEEDED",
                    message: "You have used your 10 free questions. Please Login to continue."
                });
            }
        }

        let wordInstruction = "";
        if (detailLevel === "short") {
            wordInstruction = "Keep explanations extremely concise (approx 20-30 words).";
        } else if (detailLevel === "medium") {
            wordInstruction = "Provide balanced explanations (approx 50-60 words).";
        } else {
            wordInstruction = "Provide detailed explanations (approx 80-100 words).";
        }

        let jsonStructure = "";
        let cardCountInstruction = "";

        if (cardLimit === 6) {
            cardCountInstruction = "You MUST generate exactly 6 cards. Cover the topic comprehensively (e.g., Definition, Analogy, Application/Context, How It Works, Important Details, Common Confusion).";
            jsonStructure = `
            {
                "card1": { "title": "Short Creative Title", "content": "..." },
                "card2": { "title": "Short Creative Title", "content": "..." },
                "card3": { "title": "Short Creative Title", "content": "..." },
                "card4": { "title": "Short Creative Title", "content": "..." },
                "card5": { "title": "Short Creative Title", "content": "..." },
                "card6": { "title": "Short Creative Title", "content": "..." }
            }`;
        } else {
            cardCountInstruction = "You MUST generate exactly 4 cards. Cover the basics (e.g., Definition, Analogy, Application/Context, Common Confusion).";
            jsonStructure = `
            {
                "card1": { "title": "Short Creative Title", "content": "..." },
                "card2": { "title": "Short Creative Title", "content": "..." },
                "card3": { "title": "Short Creative Title", "content": "..." },
                "card4": { "title": "Short Creative Title", "content": "..." }
            }`;
        }

        const prompt = `
        You are an expert AI Tutor acting as: ${persona}.
        Your goal is to explain the topic: "${topic}".

        SETTINGS:
        - Output Language: ${language} (Mix English and Hindi naturally if Hinglish is selected).
        - Analogy Style: ${style}.
        - Detail Level: ${detailLevel} (${wordInstruction}).

        INSTRUCTIONS:
        - Use the specific tone of the persona selected.
        - ${cardCountInstruction}
        - **DYNAMIC TITLES:** Generate creative, short (2-5 words), and relevant titles.
        - **ADAPTIVE CONTENT:** Follow a logical teaching flow.
        - **HIGHLIGHTING:** Use **double asterisks** to highlight **important sentences, key phrases, and complete definitions**.
        
        - Return the response in this strict JSON structure:
        ${jsonStructure}
        - STRICTLY return only valid JSON. Do not add markdown code blocks like \`\`\`json.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;

        let text = response.text();
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const jsonResponse = JSON.parse(text);

        res.json({
            success: true,
            data: jsonResponse
        });

    } catch (error) {
        console.error("Error in /api/generate:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error. The daily request limit for the free Gemini API (20 requests per day) has been exceeded.",
            error: error.message
        });
    }
});

app.get('/api/guest-status', async (req, res) => {
    const clientIp = req.clientIp;
    const doc = await db.collection('guest_tracking').doc(clientIp).get();

    let used = 0;
    if (doc.exists) {
        used = doc.data().count;
    }

    res.json({
        used: used,
        remaining: Math.max(0, GUEST_LIMIT - used),
        isLimitExceeded: used >= GUEST_LIMIT
    });
});

app.listen(PORT, () => {
    console.log(`Concept-Dost Server running on http://127.0.0.1:${PORT}`);
});
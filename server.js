const express = require('express');
const cors = require('cors');
const path = require('path');
const Groq = require('groq-sdk');
require('dotenv').config({ path: '.env.local' }); // Try .env.local first
require('dotenv').config(); // Fallback to .env

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ─── Rate Limiting (in-memory, 20 requests/min per IP) ────────────────────────
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20;

function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    if (!rateLimitStore.has(ip)) {
        rateLimitStore.set(ip, []);
    }
    const timestamps = rateLimitStore.get(ip).filter(t => now - t < RATE_LIMIT_WINDOW);
    if (timestamps.length >= RATE_LIMIT_MAX) {
        return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    }
    timestamps.push(now);
    rateLimitStore.set(ip, timestamps);
    next();
}

// Clean up rate limit store every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of rateLimitStore.entries()) {
        const valid = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
        if (valid.length === 0) rateLimitStore.delete(ip);
        else rateLimitStore.set(ip, valid);
    }
}, 5 * 60 * 1000);

// ─── Input Sanitization ───────────────────────────────────────────────────────
function sanitizeInput(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/<[^>]*>/g, '')        // Strip HTML tags
        .replace(/[^\w\s.,!?'"₹$%@#&()\-+=:;/\n]/g, '') // Keep only safe characters
        .trim()
        .slice(0, 2000);               // Max 2000 chars
}

// Serve static files from pages and public directories
app.use(express.static(path.join(__dirname, 'pages')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Initialize Groq API
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'dummy_key'
});

// ─── /api/explain — AI Portfolio Explainer ────────────────────────────────────
app.post('/api/explain', rateLimiter, async (req, res) => {
    try {
        if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.includes('your_key_here')) {
            // Mock response if no API key is provided
            return res.json({
                explanation: "I see you're asking about your portfolio. Currently, my AI brain is sleeping because the GROQ_API_KEY is not set in the .env file. Please add your key to enable my full potential!",
                riskScore: 50,
                suggestions: ["Add Groq API Key to .env"]
            });
        }

        const { portfolio, question, mode, history } = req.body;
        const sanitizedQuestion = sanitizeInput(question);

        const systemPrompt = `You are Nerve AI, a calm and encouraging financial educator.
Your role is to:
1. Explain investment concepts in plain, non-threatening language
2. Never give specific buy/sell advice — only educate
3. Always contextualize risk with historical data
4. Use analogies and relatable comparisons
5. If the user seems anxious, acknowledge their feelings and provide reassurance with data
6. When in ELI5 mode, explain like you're talking to a curious 10-year-old

User's current portfolio: ${portfolio ? JSON.stringify(portfolio) : 'Not provided yet'}
Mode: ${mode === 'eli5' ? 'Explain Like I\'m 5 (very simple)' : 'Normal'}
Please answer the user's question. Remember the disclaimer: "For educational purposes only. Not financial advice."`;

        // Format history for Groq/OpenAI format
        const messages = [
            { role: "system", content: systemPrompt }
        ];

        if (history && Array.isArray(history)) {
            history.slice(-6).forEach(msg => {
                messages.push({
                    role: msg.role === 'model' ? 'assistant' : 'user',
                    content: typeof msg.parts === 'string' ? msg.parts : 
                             (Array.isArray(msg.parts) && msg.parts[0].text ? msg.parts[0].text : JSON.stringify(msg.parts))
                });
            });
        }

        messages.push({ role: "user", content: sanitizedQuestion || "Hello!" });

        const completion = await groq.chat.completions.create({
            messages: messages,
            model: "llama-3.1-8b-instant",
            max_tokens: 1000,
            temperature: 0.7,
        });

        const text = completion.choices[0]?.message?.content || "";

        res.json({
            explanation: text,
            riskScore: 50,
            suggestions: []
        });

    } catch (error) {
        console.error('Error with Groq API:', error);
        res.status(500).json({ error: 'Failed to generate explanation. Please try again later.' });
    }
});

// ─── /api/analyze — Portfolio Risk Analysis ───────────────────────────────────
app.post('/api/analyze', rateLimiter, async (req, res) => {
    try {
        const { portfolioType, holdings, scenario } = req.body;

        // Risk score weights by portfolio type
        const riskWeights = {
            conservative: { baseRisk: 25, volatilityMultiplier: 0.5 },
            balanced:     { baseRisk: 50, volatilityMultiplier: 1.0 },
            aggressive:   { baseRisk: 78, volatilityMultiplier: 1.5 }
        };

        const weights = riskWeights[portfolioType] || riskWeights.balanced;

        // Compute current risk based on scenario volatility
        let scenarioVolatility = 0;
        if (scenario && scenario.summary) {
            const worstMonth = Math.abs(scenario.summary.worstMonth || 0);
            const bestMonth = Math.abs(scenario.summary.bestMonth || 0);
            scenarioVolatility = (worstMonth + bestMonth) / 2;
        }

        const adjustedRisk = Math.min(100, Math.max(0,
            weights.baseRisk + (scenarioVolatility * weights.volatilityMultiplier)
        ));

        // Compute portfolio health metrics
        let totalValue = 0;
        let totalPnl = 0;
        if (holdings && Array.isArray(holdings)) {
            holdings.forEach(h => {
                totalValue += h.currentValue || 0;
                totalPnl += (h.currentValue || 0) - (h.investedValue || 0);
            });
        }

        const pnlPercentage = totalValue > 0 ? (totalPnl / (totalValue - totalPnl)) * 100 : 0;

        // If Gemini is available, get an AI-generated insight
        let aiInsight = "Your portfolio risk profile has been analyzed based on historical patterns and your asset allocation.";

        if (process.env.GROQ_API_KEY) {
            try {
                const prompt = sanitizeInput(
                    `In 2 sentences, give a brief risk insight for a ${portfolioType} portfolio with ${pnlPercentage.toFixed(1)}% P&L in a ${scenario?.name || 'current'} market scenario. Be encouraging and educational.`
                );
                
                const completion = await groq.chat.completions.create({
                    messages: [
                        { role: "system", content: "You are a helpful financial risk analyzer." },
                        { role: "user", content: prompt }
                    ],
                    model: "llama-3.1-8b-instant",
                    max_tokens: 150,
                });
                
                aiInsight = completion.choices[0]?.message?.content || aiInsight;
            } catch (aiErr) {
                console.warn('AI insight generation failed, using fallback:', aiErr.message);
            }
        }

        res.json({
            riskScore: Math.round(adjustedRisk),
            riskLabel: adjustedRisk < 35 ? 'Low Risk' : adjustedRisk < 65 ? 'Moderate Risk' : 'High Risk',
            portfolioValue: totalValue,
            pnl: totalPnl,
            pnlPercentage: parseFloat(pnlPercentage.toFixed(2)),
            aiInsight,
            scenarioVolatility: parseFloat(scenarioVolatility.toFixed(1))
        });

    } catch (error) {
        console.error('Error in /api/analyze:', error);
        res.status(500).json({ error: 'Failed to analyze portfolio.' });
    }
});

// Fallback to index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

// Fallback for any other HTML files that might be missing the extension
app.get('/:page', (req, res, next) => {
    const page = req.params.page;
    if (!page.includes('.')) {
        res.sendFile(path.join(__dirname, 'pages', `${page}.html`), (err) => {
            if (err) {
                next(); // Pass to next handler (e.g., 404)
            }
        });
    } else {
        next();
    }
});

app.listen(PORT, () => {
    console.log(`Nerve server running on http://localhost:${PORT}`);
    console.log(`Make sure to set GROQ_API_KEY in your .env file to enable AI features.`);
});

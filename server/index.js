require('dotenv').config({ path: '../.env' });
const express = require('express');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const fetch = require('node-fetch');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

app.use(rateLimit({ windowMs: 60 * 1000, max: 30 }));

// in-memory session counts (keyed by session id or IP). Note: memory store resets on server restart.
const sessionCounts = new Map();

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) console.warn('OPENAI_API_KEY not set in environment (../.env)');

let resumeText = '';
async function loadResume() {
  try {
    const pdfPath = path.join(__dirname, '..', 'assets', 'Resumes', 'Arumalla_Mohit_Krishna.pdf');
    const data = fs.readFileSync(pdfPath);
    const parsed = await pdf(data);
    resumeText = (parsed && parsed.text) ? parsed.text.slice(0, 20000) : '';
    console.log('Loaded resume text length:', resumeText.length);
  } catch (err) {
    console.warn('Could not load resume PDF:', err.message);
    resumeText = '';
  }
}
loadResume();

app.post('/api/chat', async (req, res) => {
  try {
    // enforce per-session limit (10 requests per session id)
    const sessionId = (req.get('x-session-id') || req.ip);
    const prev = sessionCounts.get(sessionId) || 0;
    if (prev >= 10) {
      return res.status(429).json({ error: 'Session rate limit exceeded (10 requests per session)' });
    }
    sessionCounts.set(sessionId, prev + 1);

    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.length > 2000) {
      return res.status(400).json({ error: 'Invalid question' });
    }
    if (!OPENAI_KEY) return res.status(500).json({ error: 'Server not configured with OPENAI_API_KEY' });

    const systemPrompt = `You are a helpful assistant answering questions about the resume and profile of Mohit Krishna Arumalla. Use only the information provided in the context to answer; if the user asks unrelated questions, say you can only answer questions about Mohit's profile.\n\nContext:\n${resumeText}`;

    const body = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      max_tokens: 700,
      temperature: 0.1
    };

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      return res.status(502).json({ error: 'OpenAI error', detail: txt });
    }

    const json = await openaiRes.json();
    const answer = json.choices?.[0]?.message?.content || '';
    return res.json({ answer });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

// Optional: Serve static site from parent directory (so you can run server and visit site on same origin)
const siteRoot = path.join(__dirname, '..');
app.use(express.static(siteRoot));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Resume proxy server listening on port ${port}`));

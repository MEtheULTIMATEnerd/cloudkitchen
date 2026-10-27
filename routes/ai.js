// routes/ai.js
const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { analyze: localAnalyze } = require('../utils/healthAnalyzer');

module.exports = (ID_SUFFIX) => {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const client = hasOpenAI ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

  router.post(`/api/ai/analyze-${ID_SUFFIX}`, async (req, res) => {
    try {
      const { title, ingredients, servings } = req.body || {};
      if (!ingredients || (Array.isArray(ingredients) && !ingredients.length)) {
        return res.status(400).json({ ok: false, message: 'Ingredients are required.' });
      }

      // Try OpenAI first if key exists
      if (client) {
        try {
          const prompt = [
            'You are a nutrition assistant. Analyze healthiness (0..100) of this recipe based on ingredients.',
            'Return JSON with fields: healthScore (0..100), summary (1 sentence), concerns (array), suggestions (array).',
            'Ingredients may include amounts; be concise and helpful.',
            `Title: ${title || 'Recipe'}`,
            `Servings (if provided): ${servings || 'n/a'}`,
            `Ingredients:\n${Array.isArray(ingredients) ? ingredients.join('\n') : String(ingredients)}`
          ].join('\n');

          const completion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            response_format: { type: 'json_object' }
          });

          const raw = completion.choices?.[0]?.message?.content || '{}';
          let parsed;
          try { parsed = JSON.parse(raw); } catch { parsed = null; }

          if (parsed && typeof parsed.healthScore === 'number') {
            return res.json({ ok: true, result: { provider: 'openai', ...parsed } });
          }
          // If OpenAI returned something odd, fall through to local analysis
        } catch (err) {
          console.error('AI analyze (OpenAI) error:', err?.status || err?.message || err);
          // fall back
        }
      }

      // ---- Enhanced Local Fallback ----
      const result = localAnalyze({ title, ingredients, servings });
      return res.json({
        ok: true,
        result,
        message: hasOpenAI ? 'Using local analysis due to AI quota/unavailability.' : 'Using local analysis (no AI key).'
      });

    } catch (err) {
      console.error('AI analyze error:', err?.status || err?.message || err);
      return res.status(500).json({ ok: false, message: 'AI analysis failed.' });
    }
  });

  return router;
};
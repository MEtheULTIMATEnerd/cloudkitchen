// utils/healthAnalyzer.js
// No external deps. Very lightweight heuristic nutrition estimator for fallback use.

const UNIT_TO_GRAMS = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  ml: 1,         // treat ml ~ g (water density). Close enough for a heuristic.
  l: 1000,
  tbsp: 15,
  tablespoon: 15,
  tsp: 5,
  teaspoon: 5,
  cup: 240,      // rough average; varies by ingredient
  cups: 240,
  piece: 50,
  pcs: 50,
  slice: 30,
  slices: 30
};

// Very small “mini DB” (per 100g) to steer the heuristics.
const DB = {
  // carbs-heavy
  pasta_white:      { kcal: 157, carbs: 31, protein: 6, fat: 1, fiber: 1, satFat: 0.2, sodiumMg: 6 },
  pasta_whole:      { kcal: 160, carbs: 30, protein: 7, fat: 2, fiber: 4, satFat: 0.3, sodiumMg: 6 },
  bread_white:      { kcal: 265, carbs: 49, protein: 9, fat: 3.2, fiber: 2.7, satFat: 0.7, sodiumMg: 490 },
  bread_whole:      { kcal: 247, carbs: 41, protein: 13, fat: 4.2, fiber: 7, satFat: 0.6, sodiumMg: 430 },
  rice_white:       { kcal: 130, carbs: 28, protein: 2.7, fat: 0.3, fiber: 0.4, satFat: 0.1, sodiumMg: 1 },

  // proteins / fats
  bacon:            { kcal: 541, carbs: 1.4, protein: 37, fat: 42, fiber: 0, satFat: 14, sodiumMg: 1717, processed: true },
  chicken_breast:   { kcal: 165, carbs: 0, protein: 31, fat: 3.6, fiber: 0, satFat: 1, sodiumMg: 74 },
  egg:              { kcal: 155, carbs: 1.1, protein: 13, fat: 11, fiber: 0, satFat: 3.3, sodiumMg: 124 },
  tofu:             { kcal: 76,  carbs: 1.9, protein: 8,  fat: 4.8, fiber: 0.3, satFat: 0.7, sodiumMg: 7 },

  // dairy/fats
  cream_heavy:      { kcal: 340, carbs: 2.9, protein: 2,  fat: 36, fiber: 0, satFat: 23, sodiumMg: 40 },
  greek_yogurt:     { kcal: 97,  carbs: 3.6, protein: 10, fat: 5,  fiber: 0, satFat: 3,  sodiumMg: 50 },
  parmesan:         { kcal: 431, carbs: 4.1, protein: 38, fat: 29, fiber: 0, satFat: 19, sodiumMg: 1800 },
  olive_oil:        { kcal: 884, carbs: 0,   protein: 0,  fat: 100, fiber: 0, satFat: 14, sodiumMg: 0, unsat: true },
  butter:           { kcal: 717, carbs: 0,   protein: 0.9,fat: 81,  fiber: 0, satFat: 51, sodiumMg: 11 },

  // produce
  tomato:           { kcal: 18,  carbs: 3.9, protein: 0.9,fat: 0.2, fiber: 1.2, satFat: 0, sodiumMg: 5 },
  avocado:          { kcal: 160, carbs: 8.5, protein: 2,  fat: 15,  fiber: 6.7, satFat: 2.1, sodiumMg: 7, unsat: true },
  spinach:          { kcal: 23,  carbs: 3.6, protein: 2.9,fat: 0.4, fiber: 2.2, satFat: 0.1, sodiumMg: 79 }
};

// Simple mapping by keyword
function classify(ing) {
  const s = ing.toLowerCase();
  if (/\bwhole\W*wheat\b|\bwholemeal\b/.test(s) && /\bpasta\b/.test(s)) return 'pasta_whole';
  if (/\bpasta\b/.test(s))                    return 'pasta_white';
  if (/\bwhole\W*wheat\b|\bwholemeal\b/.test(s) && /\bbread\b/.test(s)) return 'bread_whole';
  if (/\bbread\b|\btoast\b/.test(s))         return 'bread_white';
  if (/\brice\b/.test(s))                     return 'rice_white';
  if (/\bbacon\b/.test(s))                    return 'bacon';
  if (/\bchicken\b/.test(s))                  return 'chicken_breast';
  if (/\begg\b/.test(s))                      return 'egg';
  if (/\btofu\b/.test(s))                     return 'tofu';
  if (/\bheavy\b|\bcream\b/.test(s))          return 'cream_heavy';
  if (/\bgreek\b|\byogurt\b/.test(s))         return 'greek_yogurt';
  if (/\bparmesan\b/.test(s))                 return 'parmesan';
  if (/\bolive oil\b/.test(s))                return 'olive_oil';
  if (/\bbutter\b/.test(s))                   return 'butter';
  if (/\btomato\b/.test(s))                   return 'tomato';
  if (/\bavocado\b/.test(s))                  return 'avocado';
  if (/\bspinach\b/.test(s))                  return 'spinach';
  return null;
}

// Parse "200g", "2 tbsp", "1 cup", "2 eggs", "2 slices bread", etc → grams
function parseAmount(ing) {
  const s = ing.toLowerCase().trim();

  // 1) e.g. "200 g", "500ml", "1.5 kg", "2 tbsp", "3 tsp", "1 cup", "2 cups"
  const rx = /(\d+(?:\.\d+)?)\s*(kg|g|l|ml|tbsp|tablespoon|tsp|teaspoon|cup|cups|slice|slices|piece|pcs)\b/;
  const m1 = s.match(rx);
  if (m1) {
    const amount = parseFloat(m1[1]);
    const unit = m1[2];
    const gramsPerUnit = UNIT_TO_GRAMS[unit] || 1;
    return amount * gramsPerUnit;
  }

  // 2) “2 eggs”, “2 slices bread”
  const m2 = s.match(/(\d+(?:\.\d+)?)\s*(egg|eggs|slice|slices|piece|pcs)\b/);
  if (m2) {
    const amount = parseFloat(m2[1]);
    const unit = m2[2].replace(/s$/, '');
    const gramsPerUnit = UNIT_TO_GRAMS[unit] || 50;
    return amount * gramsPerUnit;
  }

  // 3) If no explicit amount but known “small-fat” liquids like olive oil tbsp in text
  if (/\btbsp\b/.test(s) && /\bolive oil\b/.test(s)) return 15; // 1 tbsp ~ 15g
  if (/\btsp\b/.test(s)  && /\bolive oil\b/.test(s)) return 5;

  // Fallback: if classified bread slice with no amount, assume 1 slice
  if (/\bslice\b|\bslices\b/.test(s) && /\bbread\b/.test(s)) return 30; // 1 slice

  // Unknown: assume modest 100g
  return 100;
}

// Return per-ingredient nutrition (kcal, carbs, protein, fat, fiber, satFat, sodiumMg, flags)
function estimateIngredient(ing) {
  const grams = parseAmount(ing);
  const key = classify(ing);
  let ref = null;

  if (key && DB[key]) ref = DB[key];

  // Unknown heuristic: treat as generic carb-ish ingredient
  if (!ref) {
    ref = { kcal: 200, carbs: 35, protein: 5, fat: 3, fiber: 2, satFat: 1, sodiumMg: 100 };
  }

  const factor = grams / 100;
  const out = {
    grams,
    kcal: round(ref.kcal * factor),
    carbs: round(ref.carbs * factor),
    protein: round(ref.protein * factor),
    fat: round(ref.fat * factor),
    fiber: round(ref.fiber * factor),
    satFat: round(ref.satFat * factor),
    sodiumMg: round(ref.sodiumMg * factor),
    processed: !!ref.processed,
    unsat: !!ref.unsat,
    tag: key
  };

  return out;
}

function round(n, d = 1) { return Math.round(n * Math.pow(10, d)) / Math.pow(10, d); }

function scoreAndSuggestions(total, perServe, flags) {
  // Start at 100, subtract penalties, add bonuses
  let score = 100;
  const concerns = [];
  const suggestions = [];

  // Penalties
  if (flags.anyProcessedMeat) { score -= 15; concerns.push('Processed meats present'); suggestions.push('Swap processed meats (e.g., bacon) for lean/unprocessed proteins (chicken, beans, tofu).'); }
  if (perServe.satFat > 10)   { score -= 12; concerns.push('High saturated fat per serving'); suggestions.push('Reduce cream/butter/cheese; use Greek yogurt or smaller amounts.'); }
  if (perServe.sodiumMg > 800){ score -= 10; concerns.push('High sodium'); suggestions.push('Reduce salty ingredients (bacon, cheese, added salt).'); }
  if (perServe.kcal > 800)    { score -= 8;  concerns.push('High calories per serving'); suggestions.push('Trim oil/cheese/cream, increase vegetables.'); }
  if (perServe.fiber < 5)     { score -= 6;  concerns.push('Low fiber'); suggestions.push('Add veggies/legumes/whole grains to increase fiber.'); }

  // Bonuses
  if (flags.anyUnsatFat)      { score += 4;  suggestions.push('Contains heart-healthy unsaturated fats (e.g., olive oil, avocado).'); }
  if (flags.anyWholeGrain)    { score += 5;  suggestions.push('Whole grains improve fiber and satiety.'); }
  if (flags.goodProtein)      { score += 4;  suggestions.push('Balanced protein per serving.'); }

  // Clamp 0..100
  score = Math.max(0, Math.min(100, score));

  return { score, concerns, suggestions };
}

/**
 * Analyze recipe locally (fallback).
 * @param {{ title?: string, ingredients: string[] | string, servings?: number }} payload
 */
function analyze(payload) {
  const name = String(payload?.title || 'Recipe').trim();
  const list = Array.isArray(payload?.ingredients)
    ? payload.ingredients
    : String(payload?.ingredients || '').split('\n').map(s => s.trim()).filter(Boolean);

  const servings = (Number(payload?.servings) > 0) ? Number(payload.servings) : 2;

  const items = list.map(estimateIngredient);

  // Totals
  const total = items.reduce((a, x) => ({
    grams: a.grams + x.grams,
    kcal: a.kcal + x.kcal,
    carbs: a.carbs + x.carbs,
    protein: a.protein + x.protein,
    fat: a.fat + x.fat,
    fiber: a.fiber + x.fiber,
    satFat: a.satFat + x.satFat,
    sodiumMg: a.sodiumMg + x.sodiumMg,
    anyProcessedMeat: a.anyProcessedMeat || x.processed,
    anyUnsatFat: a.anyUnsatFat || x.unsat,
    anyWholeGrain: a.anyWholeGrain || (x.tag === 'bread_whole' || x.tag === 'pasta_whole')
  }), { grams:0,kcal:0,carbs:0,protein:0,fat:0,fiber:0,satFat:0,sodiumMg:0, anyProcessedMeat:false, anyUnsatFat:false, anyWholeGrain:false });

  // Per serving
  const perServe = {
    grams:    round(total.grams / servings, 0),
    kcal:     round(total.kcal / servings, 0),
    carbs:    round(total.carbs / servings),
    protein:  round(total.protein / servings),
    fat:      round(total.fat / servings),
    fiber:    round(total.fiber / servings),
    satFat:   round(total.satFat / servings),
    sodiumMg: round(total.sodiumMg / servings, 0)
  };

  // Protein “good” if 15–45g per serving (broad)
  const flags = {
    anyProcessedMeat: total.anyProcessedMeat,
    anyUnsatFat: total.anyUnsatFat,
    anyWholeGrain: total.anyWholeGrain,
    goodProtein: perServe.protein >= 15 && perServe.protein <= 45
  };

  const { score, concerns, suggestions } = scoreAndSuggestions(total, perServe, flags);

  // Maintain compatibility with your UI field names
  return {
    provider: 'local-fallback+',
    healthScore: score,
    summary: `${name} scores ${score}/100 for healthiness. (~${perServe.kcal} kcal/serving)`,
    concerns,
    suggestions,
    // extra details if you want to show later
    servings,
    totals: {
      grams: round(total.grams, 0), kcal: round(total.kcal, 0),
      carbs: round(total.carbs), protein: round(total.protein), fat: round(total.fat),
      fiber: round(total.fiber), satFat: round(total.satFat), sodiumMg: round(total.sodiumMg, 0)
    },
    perServing: perServe,
    flags
  };
}

module.exports = { analyze };
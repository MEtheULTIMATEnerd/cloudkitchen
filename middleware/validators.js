// middleware/validators.js

// -------- helpers --------
const toLines = (v) =>
  Array.isArray(v)
    ? v.map(x => String(x).trim()).filter(Boolean)
    : String(v || '')
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

function jsonBad(res, status, message) {
  return res.status(status).json({ ok: false, message });
}

// Optional: parse "2 kg" / "500 ml" / "12 pcs" into { quantity, unit }
const ALLOWED_UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'packs'];
function parseQtyUnit(input) {
  const s = String(input || '').trim();
  const m = s.match(/^([0-9]+(?:\.[0-9]+)?)\s*([A-Za-z]+)$/);
  if (!m) return null;
  let [, q, u] = m;
  u = (u === 'l') ? 'L' : u.toLowerCase();
  if (!ALLOWED_UNITS.includes(u)) return null;
  const quantity = Number(q);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  return { quantity, unit: u };
}

/* ===================== RECIPES ===================== */
function validateRecipe(req, res, next) {
  try {
    const {
      title, chef, ingredients, instructions,
      mealType, cuisineType, prepTime, difficulty, servings
    } = req.body;

    if (!String(title || '').trim())       return jsonBad(res, 400, 'Title is required.');
    if (!String(chef || '').trim())        return jsonBad(res, 400, 'Chef is required.');
    if (!String(mealType || '').trim())    return jsonBad(res, 400, 'Meal type is required.');
    if (!String(cuisineType || '').trim()) return jsonBad(res, 400, 'Cuisine type is required.');
    if (!String(difficulty || '').trim())  return jsonBad(res, 400, 'Difficulty is required.');

    const prep = Number(prepTime);
    const serv = Number(servings);
    if (!Number.isFinite(prep) || prep <= 0) return jsonBad(res, 400, 'Prep time must be a positive number.');
    if (!Number.isFinite(serv) || serv <= 0) return jsonBad(res, 400, 'Servings must be a positive number.');

    const ing   = toLines(ingredients);
    const steps = toLines(instructions);
    if (!ing.length)   return jsonBad(res, 400, 'Ingredients cannot be empty.');
    if (!steps.length) return jsonBad(res, 400, 'Instructions cannot be empty.');

    // normalize
    req.body.title       = String(title).trim();
    req.body.chef        = String(chef).trim();
    req.body.mealType    = String(mealType).trim();
    req.body.cuisineType = String(cuisineType).trim();
    req.body.difficulty  = String(difficulty).trim();
    req.body.prepTime    = prep;
    req.body.servings    = serv;
    req.body.ingredients = ing;
    req.body.instructions= steps;

    next();
  } catch (err) {
    console.error('validateRecipe error:', err);
    return jsonBad(res, 400, 'Invalid recipe payload.');
  }
}

/* ===================== INVENTORY ===================== */
// userId is OPTIONAL for shared inventory.
// Accepts either (quantity + unit) or, if they were mistakenly combined,
// a single `quantityWithUnit` which we parse and normalize.
function validateInventory(req, res, next) {
  try {
    let {
      ingredientName, quantity, unit, category,
      purchaseDate, expirationDate, location, cost,
      quantityWithUnit // optional fallback
    } = req.body;

    // Fallback: parse "quantityWithUnit" if separate fields missing
    if ((quantity == null || unit == null) && quantityWithUnit) {
      const parsed = parseQtyUnit(quantityWithUnit);
      if (!parsed) return jsonBad(res, 400, 'Quantity must include a valid unit (e.g., "2 kg", "500 ml", "12 pcs").');
      quantity = parsed.quantity;
      unit = parsed.unit;
    }

    if (!String(ingredientName || '').trim()) return jsonBad(res, 400, 'Missing ingredient name.');
    if (!String(unit || '').trim())           return jsonBad(res, 400, 'Missing unit.');
    if (!String(category || '').trim())       return jsonBad(res, 400, 'Missing category.');
    if (!String(location || '').trim())       return jsonBad(res, 400, 'Missing location.');

    // Dates required by your UI
    if (!String(purchaseDate || '').trim())   return jsonBad(res, 400, 'Missing purchase date.');
    if (!String(expirationDate || '').trim()) return jsonBad(res, 400, 'Missing expiration date.');

    const qty = Number(quantity);
    const cst = Number(cost);
    if (!Number.isFinite(qty) || qty <= 0) return jsonBad(res, 400, 'Quantity must be a positive number.');
    if (!Number.isFinite(cst) || cst < 0)  return jsonBad(res, 400, 'Cost must be a non-negative number.');

    const p = new Date(purchaseDate);
    const e = new Date(expirationDate);
    if (isNaN(p.getTime()) || isNaN(e.getTime())) return jsonBad(res, 400, 'Invalid dates.');
    if (e.getTime() < p.getTime())               return jsonBad(res, 400, 'Expiration date must be after purchase date.');

    // normalize back to the shape routes expect
    req.body.ingredientName = String(ingredientName).trim();
    req.body.quantity       = qty;
    req.body.unit           = String(unit).trim();
    req.body.category       = String(category).trim();
    req.body.location       = String(location).trim();
    req.body.cost           = cst;
    req.body.purchaseDate   = p.toISOString();
    req.body.expirationDate = e.toISOString();

    // DO NOT require userId; attach if present (session or payload), else null
    req.body.userId = req.session?.userId || req.body.userId || null;

    next();
  } catch (err) {
    console.error('validateInventory error:', err);
    return jsonBad(res, 400, 'Invalid inventory payload.');
  }
}

module.exports = { validateRecipe, validateInventory };
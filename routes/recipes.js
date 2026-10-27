// routes/recipes.js
const express = require('express');
const Recipe = require('../models/Recipe');
const { validateRecipe } = require('../middleware/validators');
const { ensureLoggedIn, requireRole, ownerOrAdmin } = require('../middleware/auth');

module.exports = (ID_SUFFIX) => {
  const router = express.Router();

  const escapeRegex = (s) => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lines = (v) =>
    Array.isArray(v)
      ? v.map(x => String(x).trim()).filter(Boolean)
      : String(v || '').split('\n').map(x => x.trim()).filter(Boolean);

  const roleOf  = (req) => String(req.session?.role || '').toLowerCase();
  const uidOf   = (req) => req.session?.userId || null;
  const nameOf  = (req) => (req.session?.fullname || '').trim();
  const isAdmin = (req) => roleOf(req) === 'admin';

  // -------- JSON API --------

  // Secure "get one" for editing (owner or admin only)
  router.get(
    `/api/recipes/secure/:rid-${ID_SUFFIX}`,
    ensureLoggedIn,
    ownerOrAdmin(Recipe, 'recipeId'),
    async (req, res) => {
      try {
        const rid = req.params.rid;
        const doc = await Recipe.findOne({ recipeId: rid }).lean();
        if (!doc) return res.status(404).json({ ok: false, message: 'Recipe not found' });
        return res.json({ ok: true, recipe: doc });
      } catch (err) {
        console.error('secure get error:', err);
        return res.status(500).json({ ok: false, message: 'Failed to verify access.' });
      }
    }
  );

  // Public list so chefs can view others’ recipes
  router.get(`/api/recipes-${ID_SUFFIX}`, async (_req, res) => {
    try {
      const list = await Recipe.find().lean().sort({ createdDate: -1 });
      return res.json(list);
    } catch (err) {
      console.error('API get recipes error:', err);
      return res.status(500).json({ ok: false, message: 'Failed to fetch recipes' });
    }
  });

  router.get(`/api/recipes/:rid-${ID_SUFFIX}`, async (req, res) => {
    try {
      const doc = await Recipe.findOne({ recipeId: req.params.rid }).lean();
      if (!doc) return res.status(404).json({ ok: false, message: 'Recipe not found' });
      return res.json({ ok: true, recipe: doc });
    } catch (err) {
      console.error('API get recipe error:', err);
      return res.status(500).json({ ok: false, message: 'Failed to fetch recipe' });
    }
  });

  router.post(
    `/api/recipes/add-${ID_SUFFIX}`,
    ensureLoggedIn,
    requireRole('chef', 'admin'),
    validateRecipe,
    async (req, res) => {
      try {
        const { title, chef, ingredients, instructions, mealType, cuisineType, prepTime, difficulty, servings } = req.body;

        const uid = uidOf(req);
        const me  = nameOf(req);
        if (!uid) return res.status(401).json({ ok: false, message: 'Not authenticated' });

        // if the session doesn’t carry a fullname, tell the user clearly
        if (!isAdmin(req) && !me) {
          return res.status(400).json({ ok: false, message: 'Your account is missing a full name. Please update your profile or contact admin.' });
        }

        // Non-admins must submit their own name
        if (!isAdmin(req)) {
          const submittedChef = String(chef || '').trim();
          if (!submittedChef || submittedChef !== me) {
            return res.status(400).json({ ok: false, message: 'You can only add recipes with your name.' });
          }
        }

        // Duplicate title check (case-insensitive)
        const dup = await Recipe.findOne({
          title: { $regex: `^${escapeRegex(String(title || '').trim())}$`, $options: 'i' }
        }).exec();
        if (dup) return res.status(409).json({ ok: false, message: 'A recipe with that title already exists.' });

        const effectiveChef = isAdmin(req) ? String(chef || me).trim() : me;

        const doc = await Recipe.create({
          userId: uid,
          title: String(title || '').trim(),
          chef: effectiveChef,
          ingredients: lines(ingredients),
          instructions: lines(instructions),
          mealType: String(mealType || '').trim(),
          cuisineType: String(cuisineType || '').trim(),
          prepTime: Number(prepTime) || 0,
          difficulty: String(difficulty || '').trim(),
          servings: Number(servings) || 1,
          createdDate: new Date()
        });

        return res.status(201).json({ ok: true, recipe: doc });
      } catch (err) {
        console.error('API add recipe error:', err);
        let message = 'Failed to create recipe.';
        if (err?.name === 'ValidationError') message = Object.values(err.errors).map(e => e.message).join(' | ');
        if (err?.code === 11000) message = 'Duplicate value error (title or recipeId).';
        return res.status(400).json({ ok: false, message });
      }
    }
  );

  router.post(
    `/api/recipes/update-${ID_SUFFIX}`,
    ensureLoggedIn,
    ownerOrAdmin(Recipe, 'recipeId'),
    async (req, res) => {
      try {
        const { recipeId, title, chef, ingredients, instructions, mealType, cuisineType, prepTime, difficulty, servings } = req.body;
        if (!recipeId) return res.status(400).json({ ok: false, message: 'Missing recipeId' });

        const existing = await Recipe.findOne({ recipeId }).lean();
        if (!existing) return res.status(404).json({ ok: false, message: 'Recipe not found' });

        const myName = nameOf(req);
        if (!isAdmin(req)) {
          if (!myName) return res.status(400).json({ ok: false, message: 'Your account is missing a full name.' });
          const submittedChef = String(chef || '').trim();
          if (submittedChef && submittedChef !== myName) {
            return res.status(400).json({ ok: false, message: 'Chef name must match your logged-in account.' });
          }
        }

        const upd = {
          title: String(title || '').trim(),
          chef: isAdmin(req) ? String(chef || existing.chef || '').trim() : myName,
          ingredients: lines(ingredients),
          instructions: lines(instructions),
          mealType: String(mealType || '').trim(),
          cuisineType: String(cuisineType || '').trim(),
          prepTime: Number(prepTime || 0),
          difficulty: String(difficulty || '').trim(),
          servings: Number(servings || 1)
        };

        const updated = await Recipe.findOneAndUpdate({ recipeId }, upd, { new: true, runValidators: true, context: 'query' });
        if (!updated) return res.status(404).json({ ok: false, message: 'Recipe not found' });

        return res.json({ ok: true, recipe: updated });
      } catch (err) {
        console.error('API update recipe error:', err);
        let message = 'Error updating recipe.';
        if (err?.name === 'ValidationError') message = Object.values(err.errors).map(e => e.message).join(' | ');
        if (err?.code === 11000) message = 'Duplicate value error (title or recipeId).';
        return res.status(400).json({ ok: false, message });
      }
    }
  );

  router.post(
    `/api/recipes/delete-${ID_SUFFIX}`,
    ensureLoggedIn, requireRole('chef','admin'),
    async (req, res) => {
      try {
        let { recipeIds, recipeId } = req.body;
        if (!recipeIds && recipeId) recipeIds = [recipeId];
        if (!recipeIds) return res.status(400).json({ ok: false, message: 'No recipes selected.' });
        if (!Array.isArray(recipeIds)) recipeIds = [recipeIds];

        const docs = await Recipe.find({ recipeId: { $in: recipeIds } }).lean();
        if (!docs?.length) return res.status(404).json({ ok: false, message: 'No matching recipes found.' });

        const uid = uidOf(req);
        if (!isAdmin(req)) {
          const unauthorized = docs.some(d => d.userId !== uid);
          if (unauthorized) return res.status(403).json({ ok: false, message: 'You can only access your own recipes.' });
        }

        const result = await Recipe.deleteMany({ recipeId: { $in: recipeIds } });
        return res.json({ ok: true, deletedCount: result.deletedCount || 0 });
      } catch (err) {
        console.error('API delete recipes error:', err);
        return res.status(500).json({ ok: false, message: 'Error deleting recipes.' });
      }
    }
  );

  return router;
};
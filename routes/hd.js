// routes/hd.js
const express = require('express');
const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const InventoryItem = require('../models/Inventory');

module.exports = (ID_SUFFIX) => {
  const router = express.Router();

  // --- HD Task 1 (keep existing) ---
  router.get(`/hd-task1-${ID_SUFFIX}`, async (req, res) => {
    try {
      const latestRecipes = await Recipe.find()
        .lean()
        .sort({ createdDate: -1 })
        .limit(6)
        .select('recipeId title chef cuisineType difficulty prepTime createdDate')
        .exec();

      const today = new Date();
      const daysWindow = 7;
      const soonDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysWindow + 1);

      const expiringSoon = await InventoryItem.aggregate([
        { $match: { expirationDate: { $exists: true, $ne: null, $lte: soonDate } } },
        { $addFields: { daysLeft: { $ceil: { $divide: [ { $subtract: [ "$expirationDate", new Date() ] }, 1000*60*60*24 ] } } } },
        { $sort: { daysLeft: 1 } },
        { $limit: 20 },
        { $project: { _id: 0, inventoryId: 1, ingredientName: 1, quantity: 1, unit: 1, expirationDate: 1, daysLeft: 1 } }
      ]);

      const cuisineAgg = await Recipe.aggregate([
        { $group: {
            _id: { $ifNull: ["$cuisineType", "Unknown"] },
            totalRecipes: { $sum: 1 },
            avgPrepTime: { $avg: { $ifNull: ["$prepTime", 0] } },
            sampleRecipes: { $push: { title: "$title", recipeId: "$recipeId" } }
        }},
        { $project: {
            cuisine: "$_id",
            totalRecipes: 1,
            avgPrepTime: { $round: ["$avgPrepTime", 0] },
            sampleRecipes: { $slice: ["$sampleRecipes", 3] }
        }},
        { $sort: { totalRecipes: -1 } }
      ]);

      return res.render('hd-task1', {
        title: 'HD Task 1 - Recommendations',
        studentId: ID_SUFFIX,
        latestRecipes,
        expiringSoon,
        cuisineAgg,
        session: req.session || {}
      });
    } catch (err) {
      console.error('HD Task1 error:', err);
      return res.status(500).render('error', { message: 'Failed to compute recommendations', title: 'Error', studentId: ID_SUFFIX, session: req.session || {} });
    }
  });

  // --- HD Task 3: Advanced Recipe Analytics & Reporting ---
  router.get(`/hd-task3-${ID_SUFFIX}`, async (req, res) => {
    try {
      // Overall stats
      const overall = await Recipe.aggregate([
        { $facet: {
            totals: [
              { $count: "totalRecipes" },
              { $addFields: { ts: "$$CURRENT" } } // noop to keep structure
            ],
            avgPrep: [
              { $group: { _id: null, avgPrep: { $avg: "$prepTime" }, avgServings: { $avg: "$servings" } } }
            ],
            cuisineCount: [
              { $group: { _id: "$cuisineType" } },
              { $count: "cuisineTypes" }
            ]
        }},
        // we only want first doc from facet result
      ]);

      const totalRecipes = (await Recipe.countDocuments()) || 0;
      const prepAgg = await Recipe.aggregate([
        { $group: { _id: null, avgPrep: { $avg: { $ifNull: ["$prepTime", 0] } }, avgServings: { $avg: { $ifNull: ["$servings", 0] } } } }
      ]);
      const avgPrepTime = prepAgg.length ? Math.round(prepAgg[0].avgPrep) : 0;
      const avgServings = prepAgg.length ? Math.round(prepAgg[0].avgServings) : 0;
      const cuisineTypes = (await Recipe.distinct("cuisineType")).length;

      // Cuisine distribution (count, avg prepTime, sample)
      const cuisineDistribution = await Recipe.aggregate([
        { $group: {
            _id: { $ifNull: ["$cuisineType", "Unknown"] },
            count: { $sum: 1 },
            avgPrep: { $avg: { $ifNull: ["$prepTime", 0] } },
            samples: { $push: { title: "$title", recipeId: "$recipeId" } }
        }},
        { $project: {
            cuisine: "$_id", count: 1, avgPrep: { $round: ["$avgPrep", 0] }, samples: { $slice: ["$samples", 2] }
        }},
        { $sort: { count: -1 } }
      ]);

      // Difficulty analysis (counts + avg prep/servings per difficulty)
      const difficultyAgg = await Recipe.aggregate([
        { $group: {
            _id: "$difficulty",
            count: { $sum: 1 },
            avgPrep: { $avg: { $ifNull: ["$prepTime", 0] } },
            avgServings: { $avg: { $ifNull: ["$servings", 0] } }
        }},
        { $project: { difficulty: "$_id", count: 1, avgPrep: { $round: ["$avgPrep", 0] }, avgServings: { $round: ["$avgServings", 0] } } },
        { $sort: { count: -1 } }
      ]);

      // Chef productivity: per-user (userId & chef text)
      const chefAgg = await Recipe.aggregate([
        { $group: {
            _id: { userId: "$userId", chef: "$chef" },
            count: { $sum: 1 },
            avgPrep: { $avg: { $ifNull: ["$prepTime", 0] } },
            cuisines: { $addToSet: "$cuisineType" }
        }},
        { $project: { userId: "$_id.userId", chef: "$_id.chef", count: 1, avgPrep: { $round: ["$avgPrep", 0] }, cuisines: 1 } },
        { $sort: { count: -1, avgPrep: 1 } },
        { $limit: 8 }
      ]);

      // Ingredient usage: unwind ingredients and count usages
      const ingredientUsage = await Recipe.aggregate([
        { $unwind: "$ingredients" },
        { $group: { _id: { $toLower: "$ingredients" }, usageCount: { $sum: 1 } } },
        { $project: { ingredient: "$_id", usageCount: 1 } },
        { $sort: { usageCount: -1 } },
        { $limit: 20 }
      ]);

      // Top recipes by ingredient-count completeness against inventory (cookability score)
      // Very simple heuristic: count of ingredients that match inventory normalizedName substring
      const inventoryNames = (await InventoryItem.find().lean().select('normalizedName').exec()).map(i => i.normalizedName).filter(Boolean);
      // Build a small in-memory scoring (suitable for small dataset / demo)
      const recipesDocs = await Recipe.find().lean().limit(100).exec();
      const cookability = recipesDocs.map(r => {
        const ingredients = (r.ingredients || []).map(i => String(i).toLowerCase());
        let matched = 0;
        ingredients.forEach(ing => {
          if (inventoryNames.some(inv => inv && (ing.includes(inv) || inv.includes(ing)))) matched++;
        });
        const score = ingredients.length ? Math.round((matched / ingredients.length) * 100) : 0;
        return { recipeId: r.recipeId, title: r.title, matched, total: ingredients.length, score };
      }).sort((a,b) => b.score - a.score).slice(0,6);

      // Render the HD3 view
      return res.render('hd-task3', {
        title: 'HD Task 3 - Recipe Analytics',
        studentId: ID_SUFFIX,
        session: req.session || {},
        overall: { totalRecipes, avgPrepTime, avgServings, cuisineTypes },
        cuisineDistribution,
        difficultyAgg,
        chefAgg,
        ingredientUsage,
        cookability
      });
    } catch (err) {
      console.error('HD Task3 error:', err);
      return res.status(500).render('error', { message: 'Failed to load analytics', title: 'Error', studentId: ID_SUFFIX, session: req.session || {} });
    }
  });

  // --- HD Task 4: Smart Inventory Management & Cost Optimization ---
  router.get(`/hd-task4-${ID_SUFFIX}`, async (req, res) => {
    try {
      const today = new Date();
      const soon = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days

      // Items expiring in next 3 days
      const expiringSoon = await InventoryItem.find({ expirationDate: { $lte: soon } })
        .lean()
        .sort({ expirationDate: 1 })
        .limit(20)
        .exec();

      // Total value by category
      const valueByCategory = await InventoryItem.aggregate([
        { $project: { category: 1, value: { $multiply: [{ $ifNull: ["$cost", 0] }, { $ifNull: ["$quantity", 1] }] } } },
        { $group: { _id: "$category", totalValue: { $sum: "$value" }, count: { $sum: 1 } } },
        { $project: { category: "$_id", totalValue: 1, count: 1 } },
        { $sort: { totalValue: -1 } }
      ]);

      // Category consumption / turnover can't be computed without history; instead show low-stock suggestions
      const lowStock = await InventoryItem.aggregate([
        { $project: { inventoryId:1, ingredientName:1, quantity:1, unit:1, cost:1, low: { $cond: [{ $lt: ["$quantity", 2] }, true, false] } } },
        { $match: { low: true } },
        { $sort: { quantity: 1 } }
      ]);

      return res.render('hd-task4', {
        title: 'HD Task 4 - Inventory Optimization',
        studentId: ID_SUFFIX,
        session: req.session || {},
        expiringSoon,
        valueByCategory,
        lowStock
      });
    } catch (err) {
      console.error('HD Task4 error:', err);
      return res.status(500).render('error', { message: 'Failed to load inventory analytics', title: 'Error', studentId: ID_SUFFIX, session: req.session || {} });
    }
  });

  return router;
};
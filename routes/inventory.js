// routes/inventory.js
const express = require('express');
const InventoryItem = require('../models/Inventory');
const { validateInventory } = require('../middleware/validators');

module.exports = (ID_SUFFIX) => {
  const router = express.Router();

  // ---- helpers ----
  const toDate = (v, fallback = null) => {
    try {
      return v ? new Date(v) : fallback;
    } catch {
      return fallback;
    }
  };

  /* ===================== JSON API (Angular) ===================== */

  // List all inventory (shared)
  async function listHandler(_req, res) {
    try {
      const list = await InventoryItem.find().lean().sort({ createdDate: -1 });
      return res.json(list);
    } catch (err) {
      console.error('API get inventory error:', err);
      return res.status(500).json({ ok: false, message: 'Failed to fetch inventory' });
    }
  }

  // Provide both paths (some code may hit the -json variant)
  router.get(`/api/inventory-${ID_SUFFIX}`, listHandler);
  router.get(`/api/inventory-json-${ID_SUFFIX}`, listHandler);

  // Get one item by inventoryId
  router.get(`/api/inventory/:iid-${ID_SUFFIX}`, async (req, res) => {
    try {
      const iid = req.params.iid;
      const item = await InventoryItem.findOne({ inventoryId: iid }).lean();
      if (!item) return res.status(404).json({ ok: false, message: 'Inventory item not found' });
      return res.json({ ok: true, item });
    } catch (err) {
      console.error('API get inventory item error:', err);
      return res.status(500).json({ ok: false, message: 'Failed to fetch inventory item' });
    }
  });

  // Create
  router.post(`/api/inventory/add-${ID_SUFFIX}`, validateInventory, async (req, res) => {
    try {
      const {
        ingredientName, quantity, unit, category,
        purchaseDate, expirationDate, location, cost
      } = req.body;

      // shared by default; attach owner if session present
      const userIdFromSession = req.session?.userId || req.body.userId || null;

      const inventoryId = `I-${Date.now().toString().slice(-6)}`;

      const doc = await InventoryItem.create({
        inventoryId,
        userId: userIdFromSession,
        ingredientName: String(ingredientName || '').trim(),
        quantity: Number(quantity) || 0,
        unit: String(unit || '').trim(),
        category: String(category || '').trim(),
        purchaseDate: toDate(purchaseDate, new Date()),
        expirationDate: toDate(expirationDate, null),
        location: String(location || '').trim(),
        cost: Number(cost) || 0,
        createdDate: new Date()
      });

      return res.status(201).json({ ok: true, item: doc });
    } catch (err) {
      console.error('API add inventory error:', err);
      let message = 'Failed to create inventory item.';
      if (err?.name === 'ValidationError') {
        message = Object.values(err.errors).map(e => e.message).join(' | ');
        return res.status(400).json({ ok: false, message });
      }
      if (err?.code === 11000) {
        return res.status(409).json({ ok: false, message: 'Duplicate value error (inventoryId or unique field).' });
      }
      return res.status(500).json({ ok: false, message });
    }
  });

  // Update
  router.post(`/api/inventory/update-${ID_SUFFIX}`, validateInventory, async (req, res) => {
    try {
      const {
        inventoryId, ingredientName, quantity, unit, category,
        purchaseDate, expirationDate, location, cost
      } = req.body;

      if (!inventoryId) {
        return res.status(400).json({ ok: false, message: 'Missing inventoryId' });
      }

      const upd = {
        ingredientName: String(ingredientName || '').trim(),
        quantity: Number(quantity) || 0,
        unit: String(unit || '').trim(),
        category: String(category || '').trim(),
        purchaseDate: toDate(purchaseDate, new Date()),
        expirationDate: toDate(expirationDate, null),
        location: String(location || '').trim(),
        cost: Number(cost) || 0
      };

      const updated = await InventoryItem.findOneAndUpdate(
        { inventoryId },
        upd,
        { new: true, runValidators: true, context: 'query' }
      );

      if (!updated) return res.status(404).json({ ok: false, message: 'Inventory item not found' });
      return res.json({ ok: true, item: updated });
    } catch (err) {
      console.error('API update inventory error:', err);
      let message = 'Error updating inventory item.';
      if (err?.name === 'ValidationError') {
        message = Object.values(err.errors).map(e => e.message).join(' | ');
        return res.status(400).json({ ok: false, message });
      }
      return res.status(500).json({ ok: false, message });
    }
  });

  // Delete single or multiple
  async function deleteHandler(req, res) {
    try {
      let { inventoryIds, inventoryId } = req.body;
      if (!inventoryIds && inventoryId) inventoryIds = [inventoryId];
      if (!inventoryIds) return res.status(400).json({ ok: false, message: 'No items selected.' });
      if (!Array.isArray(inventoryIds)) inventoryIds = [inventoryIds];

      const docs = await InventoryItem.find({ inventoryId: { $in: inventoryIds } }).lean();
      if (!docs?.length) return res.status(404).json({ ok: false, message: 'No matching items found.' });

      const result = await InventoryItem.deleteMany({ inventoryId: { $in: inventoryIds } });
      return res.json({ ok: true, deletedCount: result.deletedCount || 0 });
    } catch (err) {
      console.error('API delete inventory error:', err);
      return res.status(500).json({ ok: false, message: 'Error deleting inventory items.' });
    }
  }

  router.post(`/api/inventory/delete-${ID_SUFFIX}`, deleteHandler);
  router.post(`/api/inventory/delete-multiple-${ID_SUFFIX}`, deleteHandler);

  return router;
};
// routes/inventory.js
const express = require('express');
const InventoryItem = require('../models/Inventory');
const { validateInventory } = require('../middleware/validators');

module.exports = (ID_SUFFIX) => {
  const router = express.Router();

  // View inventory page
  router.get(`/inventory-${ID_SUFFIX}`, async (req, res) => {
    try {
      const inventory = await InventoryItem.find().lean().sort({ createdDate: -1 });
      res.render('inventory', { inventory, title: 'Inventory', studentId: ID_SUFFIX });
    } catch (err) {
      console.error('Error fetching inventory:', err);
      res.status(500).render('error', { message: 'Failed to load inventory', title: 'Error', studentId: ID_SUFFIX });
    }
  });

  // Add inventory form
  router.get(`/inventory/add-${ID_SUFFIX}`, (req, res) => {
    res.render('add-inventory', { title: 'Add Inventory', studentId: ID_SUFFIX });
  });

  // Delete inventory select page
  router.get(`/inventory/delete-${ID_SUFFIX}`, async (req, res) => {
    try {
      const inventory = await InventoryItem.find().lean().sort({ createdDate: -1 });
      res.render('delete-inventory', {
        inventory,
        studentId: ID_SUFFIX,
        title: 'Delete Inventory',
        selectedId: req.query.id || null
      });
    } catch (err) {
      console.error('Error loading delete inventory page:', err);
      res.status(500).render('error', { message: 'Failed to load delete page', title: 'Error', studentId: ID_SUFFIX });
    }
  });

  // API: get inventory JSON
  router.get(`/api/inventory-${ID_SUFFIX}`, async (req, res) => {
    try {
      const list = await InventoryItem.find().lean().sort({ createdDate: -1 });
      return res.json(list);
    } catch (err) {
      console.error('API get inventory error:', err);
      return res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  });

  // API: add inventory item
  router.post(`/api/inventory/add-${ID_SUFFIX}`, validateInventory, async (req, res) => {
    try {
      const { userId, ingredientName, quantity, unit, category, purchaseDate, expirationDate, location, cost } = req.body;
      const inventoryId = `I-${Date.now().toString().slice(-5)}`;
      const newItem = new InventoryItem({
        inventoryId,
        userId: String(userId).trim(),
        ingredientName: String(ingredientName).trim(),
        quantity: Number(quantity),
        unit: String(unit).trim(),
        category: String(category).trim(),
        purchaseDate: String(purchaseDate).trim(),
        expirationDate: String(expirationDate).trim(),
        location: String(location).trim(),
        cost: Number(cost),
        createdDate: new Date().toISOString().slice(0, 10)
      });
      await newItem.save();
      return res.redirect(`/inventory-${ID_SUFFIX}`);
    } catch (err) {
      console.error('Error adding inventory item:', err);
      return res.redirect(`/error?msg=${encodeURIComponent('Error adding inventory item.')}`);
    }
  });

  // API: delete inventory item
  router.post(`/api/inventory/delete-${ID_SUFFIX}`, async (req, res) => {
    try {
      const { inventoryId } = req.body;
      const deleted = await InventoryItem.findOneAndDelete({ inventoryId });
      if (!deleted) {
        return res.redirect(`/error?msg=${encodeURIComponent('Inventory ID not found.')}`);
      }
      return res.redirect(`/inventory-${ID_SUFFIX}`);
    } catch (err) {
      console.error('Error deleting inventory:', err);
      return res.redirect(`/error?msg=${encodeURIComponent('Error deleting inventory item.')}`);
    }
  });

  return router;
};
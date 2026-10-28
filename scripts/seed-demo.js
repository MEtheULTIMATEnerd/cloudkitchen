require('dotenv').config();
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Recipe = require('../models/Recipe');
const InventoryItem = require('../models/Inventory');

const password = process.env.DEMO_PASSWORD || 'DemoPass!23';
const hashPassword = (plain) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 100000;
  const hash = crypto.pbkdf2Sync(plain, salt, iterations, 64, 'sha256').toString('hex');
  return `${salt}:${iterations}:64:sha256:${hash}`;
};

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cloudkitchenpro');
  const user = await User.findOneAndUpdate(
    { email: 'demo@cloudkitchen.local' },
    { $set: { fullname: 'Demo Chef', role: 'chef', phone: '0400000000' }, $setOnInsert: { password: hashPassword(password) } },
    { upsert: true, new: true, runValidators: true }
  );

  if (!await Recipe.exists({ title: 'Garden Pasta' })) {
    await Recipe.create({ userId: user.userId, title: 'Garden Pasta', chef: user.fullname, ingredients: ['200g whole-wheat pasta', '100g spinach', '100g tomato'], instructions: ['Cook pasta until tender.', 'Toss with vegetables and serve.'], mealType: 'Dinner', cuisineType: 'Italian', prepTime: 25, difficulty: 'Easy', servings: 2, createdDate: new Date() });
  }

  if (!await InventoryItem.exists({ ingredientName: 'Spinach', userId: user.userId })) {
    await InventoryItem.create({ userId: user.userId, ingredientName: 'Spinach', quantity: 2, unit: 'packs', category: 'Produce', purchaseDate: new Date(), expirationDate: new Date(Date.now() + 5 * 86400000), location: 'Fridge', cost: 6.5, createdDate: new Date() });
  }

  console.log('Demo data seeded. Login: demo@cloudkitchen.local / password supplied by DEMO_PASSWORD or the documented local default.');
}

seed().catch((error) => { console.error('Demo seed failed:', error.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });

// models/Recipe.js
const mongoose = require("mongoose");
const { nextSequence } = require("./Counter");

const recipeSchema = new mongoose.Schema({
  recipeId: { type: String, unique: true },
  userId: { type: String, required: true, ref: "User" },

  title: { type: String, required: true, minlength: 3, maxlength: 100, unique: true },

  chef: {
    type: String,
    required: true,
    minlength: 2,
    maxlength: 50,
    validate: {
      validator: v => /^[A-Za-z\s'\-]+$/.test(v),
      message: "Invalid chef name"
    }
  },

  ingredients: {
    type: [String],
    validate: {
      validator: arr => Array.isArray(arr) && arr.length >= 1 && arr.length <= 20,
      message: "Ingredients must be an array with 1–20 items"
    }
  },

  instructions: {
    type: [String],
    validate: {
      validator: arr => Array.isArray(arr) && arr.length >= 1 && arr.length <= 15,
      message: "Instructions must be 1–15 steps"
    }
  },

  mealType: {
    type: String,
    enum: ["Breakfast", "Lunch", "Dinner", "Snack"],
    required: true
  },
  cuisineType: {
    type: String,
    enum: ["Italian", "Asian", "Mexican", "American", "French", "Indian", "Mediterranean", "Other"],
    required: true
  },
  prepTime: { type: Number, min: 1, max: 480, required: true },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
  servings: { type: Number, min: 1, max: 20, required: true },
  createdDate: { type: Date, required: true }
});

// ✅ generate recipeId if missing and ensure createdDate
recipeSchema.pre("validate", async function (next) {
  try {
    if (!this.recipeId) {
      const seq = await nextSequence("recipe");
      this.recipeId = `R-${String(seq).padStart(5, "0")}`;
    }
    if (!this.createdDate) this.createdDate = new Date();
    if (new Date(this.createdDate) > new Date()) {
      return next(new Error("createdDate cannot be in the future"));
    }
    next();
  } catch (err) {
    next(err);
  }
});

// ✅ keep only these helpful indexes
recipeSchema.index({ cuisineType: 1 });
recipeSchema.index({ userId: 1 });

const Recipe = mongoose.model("Recipe", recipeSchema);
module.exports = Recipe;
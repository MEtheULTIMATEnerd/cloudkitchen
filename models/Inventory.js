// models/Inventory.js
const mongoose = require("mongoose");
const { nextSequence } = require("./Counter");

// Allowed enums aligned to the UI
const UNIT_ENUM = [
  "g", "kg", "ml", "L",
  "pcs", "pieces", "packs",
  "cup", "cups", "tbsp", "tsp",
  "dozen",
  "liter", "liters"
];

const CATEGORY_ENUM = [
  "Produce", "Vegetables", "Fruit", "Fruits",
  "Meat", "Seafood", "Dairy",
  "Grains", "Dry Goods",
  "Spices", "Condiments",
  "Beverages", "Frozen", "Canned",
  "Other"
];

const LOCATION_ENUM = ["Fridge", "Freezer", "Pantry", "Counter", "Cupboard"];

// ✅ define schema (removed duplicate inline indexes)
const inventorySchema = new mongoose.Schema(
  {
    inventoryId: { type: String, unique: true },
    userId: { type: String, ref: "User" },

    ingredientName: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 50,
      validate: {
        validator: v => /^[A-Za-z\s\-]+$/.test(v),
        message: "Invalid ingredient name"
      },
      trim: true
    },

    quantity: { type: Number, required: true, min: 0.0001, max: 9999 },
    unit: { type: String, required: true, enum: UNIT_ENUM, trim: true },
    category: { type: String, required: true, enum: CATEGORY_ENUM, trim: true },

    purchaseDate: { type: Date, required: true },
    expirationDate: { type: Date, required: true },
    location: { type: String, required: true, enum: LOCATION_ENUM, trim: true },
    cost: { type: Number, required: true, min: 0, max: 99999 },
    createdDate: { type: Date, required: true },

    normalizedName: { type: String } // ❌ removed index:true
  },
  { versionKey: false }
);

// ✅ pre-validate: ensure inventoryId and createdDate exist
inventorySchema.pre("validate", async function (next) {
  try {
    if (!this.inventoryId) {
      const seq = await nextSequence("inventory");
      this.inventoryId = `I-${String(seq).padStart(5, "0")}`;
    }
    if (!this.createdDate) this.createdDate = new Date();
    next();
  } catch (e) {
    next(e);
  }
});

// ✅ pre-save: compute normalized name for text matching
inventorySchema.pre("save", function (next) {
  try {
    if (this.ingredientName) {
      let s = String(this.ingredientName || "").toLowerCase();
      s = s.replace(/[0-9\.,\/\(\)\-\+]+/g, " ");
      s = s.replace(
        /\b(?:gram|grams|g|kg|kilogram|kilograms|piece|pieces|pcs|pack|packs|cup|cups|tbsp|tsp|tablespoon|teaspoon|ml|l|liter|liters|dozen)\b/g,
        " "
      );
      s = s.replace(/\s+/g, " ").trim();
      this.normalizedName = s;
    } else {
      this.normalizedName = "";
    }
    next();
  } catch (e) {
    next(e);
  }
});

// ✅ keep only these indexes
inventorySchema.index({ normalizedName: 1 });
inventorySchema.index({ expirationDate: 1 });
inventorySchema.index({ userId: 1 });

const InventoryItem = mongoose.model("InventoryItem", inventorySchema);
module.exports = InventoryItem;
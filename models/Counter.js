// models/Counter.js
const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g., "recipe", "inventory", "user"
  seq: { type: Number, default: 0 }
});

const Counter = mongoose.model("Counter", counterSchema);

async function nextSequence(name) {
  const updated = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).exec();
  return updated.seq;
}

module.exports = { Counter, nextSequence };
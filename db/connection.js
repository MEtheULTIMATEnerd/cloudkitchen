// db/connection.js
const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cloudkitchenpro";

async function connectToMongoDB() {
  try {
    // ✅ remove deprecated options
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected successfully");
    setupListeners();
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

function setupListeners() {
  mongoose.connection.on("connected", () => console.log("📡 Mongoose connected"));
  mongoose.connection.on("error", (err) =>
    console.error("⚠️  Mongoose error:", err)
  );
  mongoose.connection.on("disconnected", () =>
    console.warn("⚠️  Mongoose disconnected")
  );

  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("MongoDB connection closed due to app termination");
    process.exit(0);
  });
}

module.exports = { connectToMongoDB, MONGO_URI };
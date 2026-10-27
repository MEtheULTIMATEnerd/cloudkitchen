// =======================
// app.js - Main Server File
// =======================

require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const { validateRecipe, validateInventory } = require("./middleware/validators");

// Import Mongo connection function and Mongoose models
const { connectToMongoDB } = require("./db/connection");
const User = require("./models/User");
const Recipe = require("./models/Recipe");
const InventoryItem = require("./models/Inventory");

// Import route modules (they export a function that accepts ID_SUFFIX)
const recipesRouterFactory = require("./routes/recipes");
const inventoryRouterFactory = require("./routes/inventory");
const authRouterFactory = require("./routes/auth");
const hdRouterFactory = require("./routes/hd");

// HD TASKS
const aiRouterFactory = require('./routes/ai');

// The auth module exports helper middleware functions to be used in routes.
const { loadCurrentUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 8080;
const ID_SUFFIX = process.env.ROUTE_SUFFIX || "demo";
const VIEWS = path.join(__dirname, "views");


// Connect frontend
const cors = require('cors');
app.use(cors({ origin: 'http://localhost:4200', credentials: true }));

// =======================
// Helpers
// =======================
function pad(n) { return String(n).padStart(5, "0"); }
async function nextRecipeId() {
  const cnt = await Recipe.countDocuments();
  return `R-${pad(cnt + 1)}`;
}
async function nextInventoryId() {
  const cnt = await InventoryItem.countDocuments();
  return `I-${pad(cnt + 1)}`;
}

// make the studentId available to middleware/templates
app.locals.studentId = ID_SUFFIX;

// =======================
// App Configuration
// =======================
app.set("view engine", "ejs");
app.set("views", VIEWS);

// --- middleware ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Simple session middleware required by auth routes
app.use(session({
  name: 'ckp.sid',
  secret: process.env.SESSION_SECRET || 'local-only-development-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// Make req.session available in all EJS templates via res.locals.session
app.use((req, res, next) => {
  res.locals.session = req.session || {};
  next();
});

// load current user for every request (after session middleware)
if (typeof loadCurrentUser === 'function') {
  app.use(loadCurrentUser);
}

// -----------------------
// Mount modular routers
// -----------------------
app.use('/', aiRouterFactory(ID_SUFFIX));
app.use('/', authRouterFactory(ID_SUFFIX));
app.use('/', recipesRouterFactory(ID_SUFFIX));
app.use('/', inventoryRouterFactory(ID_SUFFIX));
app.use('/', hdRouterFactory(ID_SUFFIX));

// =======================
// App-level HTML Routes
// =======================

app.get("/", async (req, res) => {
  try {
    // DB stats
    const [ totalRecipes, totalInventory, totalUsers ] = await Promise.all([
      Recipe.countDocuments(),
      InventoryItem.countDocuments(),
      User.countDocuments()
    ]);

    // cuisine types
    const cuisines = await Recipe.distinct("cuisineType");
    const cuisineTypes = cuisines.length;

    // total value (cost * quantity)
    const agg = await InventoryItem.aggregate([
      { $project: { value: { $multiply: [ { $ifNull: ["$cost", 0] }, { $ifNull: ["$quantity", 1] } ] } } },
      { $group: { _id: null, total: { $sum: "$value" } } }
    ]);
    const totalValue = agg.length ? agg[0].total : 0;

    // logged-in user info (from session)
    const sessionUser = req.session && req.session.userId ? {
      userId: req.session.userId,
      fullname: req.session.fullname || null,
      email: req.session.email || null
    } : null;

    res.render("index", {
      studentId: ID_SUFFIX,
      title: "Home",
      totalRecipes,
      totalInventory,
      cuisineTypes,
      totalValue,
      totalUsers,
      sessionUser,
      session: req.session || {}
    });
  } catch (err) {
    console.error("Error rendering home:", err);
    res.status(500).render("error", {
      message: "Failed to load dashboard",
      title: "Error",
      studentId: ID_SUFFIX,
      session: req.session || {}
    });
  }
});

app.get("/error", (req, res) =>
  res.render("error", {
    message: req.query.msg || "Unknown error",
    title: "Error",
    studentId: ID_SUFFIX,
    session: req.session || {}
  })
);

// 404 fallback
app.use((req, res) => {
  res.status(404).render("404", { title: "404 Not Found", studentId: ID_SUFFIX, session: req.session || {} });
});

// Start server after DB connected
async function startServer() {
  try {
    await connectToMongoDB();
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

startServer();

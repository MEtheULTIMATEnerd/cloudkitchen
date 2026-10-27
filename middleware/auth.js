// middleware/auth.js
const User = require('../models/User');

async function loadCurrentUser(req, res, next) {
  res.locals.session = req.session || {};
  if (req.session && req.session.userId) {
    try {
      const user = await User.findOne({ userId: req.session.userId }).lean();
      req.user = user || null;
      res.locals.currentUser = req.user;
      res.locals.session = req.session || {};
    } catch (e) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

function ensureLoggedIn(req, res, next) {
  if (req.user && req.user.userId) return next();
  return res.status(401).render('error', {
    message: 'You must be logged in to access that page.',
    title: 'Error',
    studentId: res.locals.studentId || req.app.locals.studentId,
    session: req.session || {}
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    const userRole = (req.user && req.user.role) ? req.user.role : null;
    if (userRole && roles.includes(userRole)) return next();
    return res.status(403).render('error', { message: 'You do not have permission to access that page.', title: 'Forbidden', studentId: res.locals.studentId, session: req.session || {} });
  };
}

// ownerOrAdmin(Model, idField) -> returns middleware
function ownerOrAdmin(Model, idField = 'recipeId') {
  return async (req, res, next) => {
    try {
      const idVal = req.body[idField] || req.params[idField] || req.query[idField];
      if (!idVal) return res.status(400).render('error', { message: 'Missing identifier', title: 'Error', studentId: res.locals.studentId, session: req.session || {} });
      const doc = await Model.findOne({ [idField]: idVal }).lean();
      if (!doc) return res.status(404).render('error', { message: 'Not found', title: 'Not found', studentId: res.locals.studentId, session: req.session || {} });

      // allow if admin or owner matches
      const sessionUserId = req.user && req.user.userId ? req.user.userId : null;
      const sessionRole = req.user && req.user.role ? req.user.role : null;
      if (sessionRole === 'admin' || (doc.userId && sessionUserId && doc.userId === sessionUserId)) {
        req.targetDoc = doc;
        return next();
      }

      return res.status(403).render('error', { message: 'Not authorized to access this resource', title: 'Forbidden', studentId: res.locals.studentId, session: req.session || {} });
    } catch (err) {
      console.error('ownerOrAdmin error', err);
      return res.status(500).render('error', { message: 'Internal error', title: 'Error', studentId: res.locals.studentId, session: req.session || {} });
    }
  };
}

module.exports = { loadCurrentUser, ensureLoggedIn, requireRole, ownerOrAdmin };
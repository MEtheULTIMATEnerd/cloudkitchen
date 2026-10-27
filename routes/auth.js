// routes/auth.js
const express = require('express');
const validator = require('validator');

const crypto = require('crypto');

// Built-in crypto-based password hashing (no third-party libs)
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 64; // bytes
const PBKDF2_DIGEST = 'sha256';

function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto
    .pbkdf2Sync(plain, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex');
  // Store as a single string so we don't need a schema change
  return `${salt}:${PBKDF2_ITERATIONS}:${PBKDF2_KEYLEN}:${PBKDF2_DIGEST}:${derived}`;
}

function verifyPassword(plain, stored) {
  const parts = typeof stored === 'string' ? stored.split(':') : [];
  if (parts.length !== 5) return false; // unknown or legacy hash format
  const [salt, iterStr, keylenStr, digest, hashHex] = parts;
  const iter = parseInt(iterStr, 10);
  const len = parseInt(keylenStr, 10);
  const derived = crypto
    .pbkdf2Sync(plain, salt, iter, len, digest)
    .toString('hex');
  // timing-safe compare
  try {
    return crypto.timingSafeEqual(Buffer.from(hashHex, 'hex'), Buffer.from(derived, 'hex'));
  } catch {
    return false;
  }
}

function isLegacyHashFormat(str) {
  return typeof str === 'string' && str.startsWith('$2');
}
const ALLOWED_ROLES = ['admin', 'chef', 'manager', 'user'];

// Keep these in sync with frontend & User.js
const FULLNAME_RE = /^[A-Za-z\s'\-]+$/;
const PHONE_RE = /^(\+614\d{8}|04\d{8})$/;
const PASSWORD_COMPLEXITY = (v) =>
  typeof v === 'string' &&
  /[A-Z]/.test(v) &&
  /[a-z]/.test(v) &&
  /[0-9]/.test(v) &&
  /[^A-Za-z0-9]/.test(v) &&
  v.length >= 8;

module.exports = function (ID_SUFFIX) {
  const router = express.Router();

  // Attach session to res.locals for templates
  router.use((req, res, next) => {
    res.locals.session = req.session || {};
    next();
  });

  const User = require('../models/User');

  const validateRole = (role) => ALLOWED_ROLES.includes(role);

  // ---------------- EJS routes (kept) ----------------

  function renderWithCommon(res, view, opts = {}) {
    const defaults = {
      title: opts.title || '',
      studentId: ID_SUFFIX,
      error: opts.error || null,
      message: opts.message || null,
      form: opts.form || {},
      session: (opts.session !== undefined) ? opts.session : (res.locals && res.locals.session) ? res.locals.session : {}
    };
    return res.render(view, Object.assign({}, defaults, opts));
  }

  router.get(`/register-${ID_SUFFIX}`, (req, res) => {
    return renderWithCommon(res, 'register', { title: 'Register' });
  });

  router.post(`/register-${ID_SUFFIX}`, async (req, res) => {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      const password = req.body.password || '';
      const fullname = (req.body.fullname || '').trim();
      const role = (req.body.role || '').trim();
      const phone = (req.body.phone || '').trim();

      if (!email || !validator.isEmail(email)) {
        return renderWithCommon(res, 'register', { title: 'Register', error: 'Please provide a valid email.', form: req.body });
      }
      if (!PASSWORD_COMPLEXITY(password)) {
        return renderWithCommon(res, 'register', { title: 'Register', error: 'Password must be 8+ chars and include uppercase, lowercase, number and special character.', form: req.body });
      }
      if (!fullname || !FULLNAME_RE.test(fullname)) {
        return renderWithCommon(res, 'register', { title: 'Register', error: 'Full name must be 2-100 chars and may include letters, spaces, hyphens and apostrophes.', form: req.body });
      }
      if (!validateRole(role)) {
        return renderWithCommon(res, 'register', { title: 'Register', error: 'Invalid role selected.', form: req.body });
      }
      if (!PHONE_RE.test(phone)) {
        return renderWithCommon(res, 'register', { title: 'Register', error: 'Please provide a valid AU mobile (04XXXXXXXX or +614XXXXXXXX).', form: req.body });
      }

      const existing = await User.findOne({ email }).exec();
      if (existing) {
        return renderWithCommon(res, 'register', { title: 'Register', error: 'Email is already registered.', form: req.body });
      }

      const hashed = hashPassword(password);
      const user = await User.create({ email, password: hashed, fullname, role, phone });

      return res.redirect(`/login-${ID_SUFFIX}?registered=1`);
    } catch (err) {
      console.error('Registration error:', err);
      const message = (err && err.name === 'ValidationError')
        ? Object.values(err.errors).map(e => e.message).join('; ')
        : (err?.message || 'Registration failed.');
      return renderWithCommon(res, 'register', { title: 'Register', error: message, form: req.body });
    }
  });

  router.get(`/login-${ID_SUFFIX}`, (req, res) => {
    const registered = req.query.registered === '1';
    const info = registered ? 'Registration successful — please log in.' : null;
    return renderWithCommon(res, 'login', { title: 'Login', message: info });
  });

  router.post(`/login-${ID_SUFFIX}`, async (req, res) => {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      const password = req.body.password || '';

      if (!email || !validator.isEmail(email)) {
        return renderWithCommon(res, 'login', { title: 'Login', error: 'Please enter a valid email.', form: req.body });
      }
      if (!password) {
        return renderWithCommon(res, 'login', { title: 'Login', error: 'Please enter your password.', form: req.body });
      }

      const user = await User.findOne({ email }).exec();
      if (!user) return renderWithCommon(res, 'login', { title: 'Login', error: 'Invalid email or password.', form: req.body });

      if (isLegacyHashFormat(user.password)) {
        return renderWithCommon(res, 'login', { title: 'Login', error: 'Your account uses a legacy password format. Please reset or re-register.', form: req.body });
      }
      const ok = verifyPassword(password, user.password);
      if (!ok) return renderWithCommon(res, 'login', { title: 'Login', error: 'Invalid email or password.', form: req.body });

      if (!req.session) req.session = {};
      req.session.userId = user.userId;
      req.session.fullname = user.fullname;
      req.session.role = user.role;
      res.locals.session = req.session;

      return res.redirect('/');
    } catch (err) {
      console.error('Login error:', err);
      return renderWithCommon(res, 'login', { title: 'Login', error: 'Login failed, try again later.', form: req.body });
    }
  });

  router.get(`/logout-${ID_SUFFIX}`, (req, res) => {
    try {
      if (req.session && typeof req.session.destroy === 'function') {
        req.session.destroy(() => res.redirect('/'));
      } else {
        if (req.session) {
          delete req.session.userId;
          delete req.session.fullname;
          delete req.session.role;
        }
        res.locals.session = req.session || {};
        return res.redirect('/');
      }
    } catch (err) {
      console.error('Logout error:', err);
      return res.redirect('/');
    }
  });

  // ---------------- JSON API for Angular ----------------

  router.post(`/api/register-${ID_SUFFIX}`, async (req, res) => {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      const password = req.body.password || '';
      const fullname = (req.body.fullname || '').trim();
      const role = (req.body.role || '').trim();
      const phone = (req.body.phone || '').trim();

      if (!email || !validator.isEmail(email)) {
        return res.status(400).json({ ok: false, message: 'Please provide a valid email.' });
      }
      if (!PASSWORD_COMPLEXITY(password)) {
        return res.status(400).json({ ok: false, message: 'Password must be 8+ chars and include uppercase, lowercase, number and special character.' });
      }
      if (!fullname || fullname.length < 2 || fullname.length > 100 || !FULLNAME_RE.test(fullname)) {
        return res.status(400).json({ ok: false, message: 'Full name must be 2-100 chars and may include letters, spaces, hyphens and apostrophes.' });
      }
      if (!validateRole(role)) {
        return res.status(400).json({ ok: false, message: 'Invalid role selected.' });
      }
      if (!PHONE_RE.test(phone)) {
        return res.status(400).json({ ok: false, message: 'Please provide a valid AU mobile (04XXXXXXXX or +614XXXXXXXX).' });
      }

      const existing = await User.findOne({ email }).exec();
      if (existing) {
        return res.status(409).json({ ok: false, message: 'Email is already registered.' });
      }

      const hashed = hashPassword(password);
      const user = await User.create({ email, password: hashed, fullname, role, phone });

      // (Optional) Set session after API registration:
      if (!req.session) req.session = {};
      req.session.userId = user.userId;
      req.session.fullname = user.fullname;
      req.session.role = user.role;

      return res.status(201).json({
        ok: true,
        user: { userId: user.userId, email: user.email, fullname: user.fullname, role: user.role, phone: user.phone }
      });
    } catch (err) {
      console.error('API Registration error:', err);
      if (err && err.code === 11000) {
        return res.status(409).json({ ok: false, message: 'Email is already registered.' });
      }
      if (err && err.name === 'ValidationError') {
        const msg = Object.values(err.errors).map(e => e.message).join('; ');
        return res.status(400).json({ ok: false, message: msg || 'Validation failed.' });
      }
      return res.status(500).json({ ok: false, message: 'Registration failed.' });
    }
  });

  router.post(`/api/login-${ID_SUFFIX}`, async (req, res) => {
    try {
      const email = (req.body.email || '').trim().toLowerCase();
      const password = req.body.password || '';

      if (!email || !validator.isEmail(email)) {
        return res.status(400).json({ ok: false, message: 'Please enter a valid email.' });
      }
      if (!password) {
        return res.status(400).json({ ok: false, message: 'Please enter your password.' });
      }

      const user = await User.findOne({ email }).exec();
      if (!user) return res.status(401).json({ ok: false, message: 'Invalid email or password.' });

      if (isLegacyHashFormat(user.password)) {
        return res.status(400).json({ ok: false, message: 'Your account uses a legacy password format. Please reset or re-register.' });
      }
      const ok = verifyPassword(password, user.password);
      if (!ok) return res.status(401).json({ ok: false, message: 'Invalid email or password.' });

      if (!req.session) req.session = {};
      req.session.userId = user.userId;
      req.session.fullname = user.fullname;
      req.session.role = user.role;
      res.locals.session = req.session;

      return res.json({
        ok: true,
        user: { userId: user.userId, email: user.email, fullname: user.fullname, role: user.role }
      });
    } catch (err) {
      console.error('API Login error:', err);
      return res.status(500).json({ ok: false, message: 'Login failed.' });
    }
  });

  router.get(`/api/logout-${ID_SUFFIX}`, (req, res) => {
    try {
      if (req.session && typeof req.session.destroy === 'function') {
        req.session.destroy(() => res.json({ ok: true }));
      } else {
        if (req.session) {
          delete req.session.userId;
          delete req.session.fullname;
          delete req.session.role;
        }
        res.locals.session = req.session || {};
        return res.json({ ok: true });
      }
    } catch (err) {
      console.error('API Logout error:', err);
      return res.status(500).json({ ok: false, message: 'Logout failed.' });
    }
  });

  router.get(`/api/roles-${ID_SUFFIX}`, (_req, res) => res.json({ roles: ALLOWED_ROLES }));

  router.get(`/api/me-${ID_SUFFIX}`, async (req, res) => {
    try {
      if (!req.session || !req.session.userId) {
        return res.status(401).json({ ok: false, message: 'Not authenticated' });
      }
      const user = await User.findOne({ userId: req.session.userId }).lean().exec();
      if (!user) return res.status(401).json({ ok: false, message: 'Session invalid' });
      return res.json({ ok: true, user: { userId: user.userId, email: user.email, fullname: user.fullname, role: user.role } });
    } catch (err) {
      console.error('API Me error:', err);
      return res.status(500).json({ ok: false, message: 'Failed to load session user.' });
    }
  });

  // Preflight helper (optional) — use a regex route (avoids path-to-regexp wildcard crash)
  router.options(/^\/api\/.*$/, (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.sendStatus(204);
  });

  router.get(`/api/users-count-${ID_SUFFIX}`, async (_req, res) => {
    try {
      const count = await User.countDocuments().exec();
      return res.json({ count });
    } catch (err) {
      console.error('Users count error:', err);
      return res.status(500).json({ message: 'Failed to load users count' });
    }
  });

  return router;
};
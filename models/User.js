// models/User.js
const mongoose = require("mongoose");
const { nextSequence } = require("./Counter");

// Keep regex & rules in sync with frontend
const FULLNAME_RE = /^[A-Za-z\s'\-]+$/;
// Mobile only: 04XXXXXXXX or +614XXXXXXXX
const PHONE_RE = /^(\+614\d{8}|04\d{8})$/;
const PASSWORD_COMPLEXITY = (v) =>
  typeof v === "string" &&
  /[A-Z]/.test(v) &&
  /[a-z]/.test(v) &&
  /[0-9]/.test(v) &&
  /[^A-Za-z0-9]/.test(v) &&
  v.length >= 8;

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => typeof v === 'string' && v.includes('@'),
        message: "Invalid email",
      },
    },

    password: {
      type: String,
      required: true,
      validate: {
        validator: (v) => {
          if (typeof v !== "string") return false;
          // Allow stored hashes (PBKDF2: salt:iterations:keylen:digest:hash or legacy $2...)
          if ((v.includes(":") && v.split(":").length === 5) || v.startsWith("$2")) return true;
          // Otherwise enforce complexity on raw passwords
          return (
            /[A-Z]/.test(v) &&
            /[a-z]/.test(v) &&
            /[0-9]/.test(v) &&
            /[^A-Za-z0-9]/.test(v) &&
            v.length >= 8
          );
        },
        message:
          "Password must be 8+ chars and include uppercase, lowercase, number and special character.",
      },
    },

    fullname: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 100,
      trim: true,
      validate: {
        validator: (v) => FULLNAME_RE.test(v),
        message:
          "Full name may only include letters, spaces, hyphens and apostrophes",
      },
    },

    role: {
      type: String,
      enum: ["admin", "chef", "manager", "user"],
      required: true,
      default: "chef",
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (v) => PHONE_RE.test(v),
        message:
          "Phone must be a valid Australian mobile (04XXXXXXXX or +614XXXXXXXX).",
      },
    },
  },
  { timestamps: true }
);

// Generate userId like U-00001 if missing
userSchema.pre("validate", async function (next) {
  try {
    if (!this.userId) {
      const seq = await nextSequence("user");
      this.userId = `U-${String(seq).padStart(5, "0")}`;
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Useful index
userSchema.index({ role: 1 });

const User = mongoose.model("User", userSchema);
module.exports = User;
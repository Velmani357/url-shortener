const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema(
  {
    longUrl: {
      type: String,
      required: true,
    },

    shortCode: {
      type: String,
      required: true,
      unique: true,
    },

    clickCount: {
      type: Number,
      default: 0,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    expiresAt: {
      type: Date,
      default: null
    },

    lastVisited: {
      type: Date,
      default: null
    },

    visitHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        browser: { type: String, default: "Unknown" },
        device: { type: String, default: "Desktop" },
        ip: { type: String, default: "Unknown" },
        country: { type: String, default: "Unknown" },
        region: { type: String, default: "Unknown" },
        city: { type: String, default: "Unknown" },
        referrer: { type: String, default: "Direct" }
      }
    ]
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Url", urlSchema);
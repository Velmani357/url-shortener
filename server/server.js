const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Url = require("./models/Url");
const User = require("./models/User");
const auth = require("./middleware/auth");

const app = express();

// Middleware
// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   credentials: true
// }));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

/* ---------------------------
   AUTH ROUTES
----------------------------*/

// Signup
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    email,
    password: hashedPassword
  });

  await newUser.save();

  res.json({ message: "User created successfully" });
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: "Invalid password" });
  }

  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
});

/* ---------------------------
   HELPERS & VALIDATION
----------------------------*/

function isValidUrl(string) {
  try {
    const newUrl = new URL(string);
    return newUrl.protocol === "http:" || newUrl.protocol === "https:";
  } catch (err) {
    return false;
  }
}

const getDeviceInfo = (userAgent) => {
  let browser = "Unknown Browser";
  let device = "Desktop";
  
  if (!userAgent) return { browser, device };

  const ua = userAgent.toLowerCase();

  if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("samsungbrowser")) browser = "Samsung Browser";
  else if (ua.includes("opera") || ua.includes("opr")) browser = "Opera";
  else if (ua.includes("trident")) browser = "Internet Explorer";
  else if (ua.includes("edge") || ua.includes("edg")) browser = "Edge";
  else if (ua.includes("chrome")) browser = "Chrome";
  else if (ua.includes("safari")) browser = "Safari";

  if (ua.includes("mobi") || ua.includes("android") || ua.includes("iphone")) {
    device = "Mobile";
  } else if (ua.includes("tablet") || ua.includes("ipad")) {
    device = "Tablet";
  }

  return { browser, device };
};

const getStyledErrorHtml = (title, message) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | NEXUS URL</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
      body {
        background: #0b0f19;
        color: white;
        font-family: 'Inter', sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        text-align: center;
      }
      .container {
        max-width: 500px;
        padding: 40px;
        border-radius: 20px;
        background: rgba(17, 24, 39, 0.6);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 240, 255, 0.2);
        box-shadow: 0 0 30px rgba(0, 240, 255, 0.1);
      }
      h1 {
        color: #00f0ff;
        font-size: 32px;
        margin-top: 0;
        margin-bottom: 15px;
        text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
      }
      p {
        color: #9ca3af;
        line-height: 1.6;
        margin-bottom: 30px;
      }
      .btn {
        display: inline-block;
        padding: 12px 24px;
        background: #00f0ff;
        color: #0b0f19;
        text-decoration: none;
        font-weight: bold;
        border-radius: 8px;
        transition: all 0.3s ease;
        box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);
      }
      .btn:hover {
        background: #00b8c7;
        box-shadow: 0 0 25px rgba(0, 240, 255, 0.6);
        transform: translateY(-2px);
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
      <h1>${title}</h1>
      <p>${message}</p>
      <a href="http://localhost:5173" class="btn">Go to Dashboard</a>
    </div>
  </body>
  </html>
`;

/* ---------------------------
   URL SHORTENER
----------------------------*/

// Create short URL (PROTECTED)
app.post("/shorten", auth, async (req, res) => {
  const { longUrl, customAlias, expiresAt } = req.body;

  if (!longUrl) {
    return res.status(400).json({ message: "longUrl is required" });
  }

  if (!isValidUrl(longUrl)) {
    return res.status(400).json({ message: "Please provide a valid URL starting with http:// or https://" });
  }

  let shortCode;

  if (customAlias) {
    const aliasRegex = /^[a-zA-Z0-9-_]{3,30}$/;
    if (!aliasRegex.test(customAlias)) {
      return res.status(400).json({ message: "Custom alias must be 3-30 characters long and contain only letters, numbers, hyphens, or underscores" });
    }

    const existing = await Url.findOne({ shortCode: customAlias });
    if (existing) {
      return res.status(400).json({ message: "Custom alias is already in use" });
    }
    shortCode = customAlias;
  } else {
    let exists = true;
    while (exists) {
      shortCode = Math.random().toString(36).substring(2, 8);
      const found = await Url.findOne({ shortCode });
      if (!found) exists = false;
    }
  }

  let parsedExpiry = null;
  if (expiresAt) {
    parsedExpiry = new Date(expiresAt);
    if (isNaN(parsedExpiry.getTime())) {
      return res.status(400).json({ message: "Invalid expiration date" });
    }
    if (parsedExpiry <= new Date()) {
      return res.status(400).json({ message: "Expiration date must be in the future" });
    }
  }

  try {
    const newUrl = new Url({
      longUrl,
      shortCode,
      userId: req.user.id,
      expiresAt: parsedExpiry
    });

    await newUrl.save();
    res.json(newUrl);
  } catch (err) {
    res.status(500).json({ message: "Error saving URL" });
  }
});

// Bulk Create short URLs (PROTECTED)
app.post("/shorten/bulk", auth, async (req, res) => {
  const { urls } = req.body;

  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ message: "An array of URLs is required" });
  }

  const results = [];
  const errors = [];

  for (let i = 0; i < urls.length; i++) {
    let item = urls[i];
    let longUrl = typeof item === "string" ? item : item.longUrl;

    if (!longUrl || !isValidUrl(longUrl)) {
      errors.push({ index: i, url: longUrl, error: "Invalid URL format" });
      continue;
    }

    try {
      let shortCode;
      let exists = true;
      while (exists) {
        shortCode = Math.random().toString(36).substring(2, 8);
        const found = await Url.findOne({ shortCode });
        if (!found) exists = false;
      }

      const newUrl = new Url({
        longUrl,
        shortCode,
        userId: req.user.id
      });

      await newUrl.save();
      results.push(newUrl);
    } catch (err) {
      errors.push({ index: i, url: longUrl, error: err.message });
    }
  }

  res.json({ results, errors });
});

// Get user URLs (Dashboard)
app.get("/myurls", auth, async (req, res) => {
  try {
    const urls = await Url.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(urls);
  } catch (err) {
    res.status(500).json({ message: "Error fetching URLs" });
  }
});

// Edit Destination URL (PROTECTED)
app.put("/url/:id", auth, async (req, res) => {
  const { longUrl } = req.body;

  if (!longUrl) {
    return res.status(400).json({ message: "longUrl is required" });
  }

  if (!isValidUrl(longUrl)) {
    return res.status(400).json({ message: "Please provide a valid URL starting with http:// or https://" });
  }

  try {
    const url = await Url.findOne({ _id: req.params.id, userId: req.user.id });
    if (!url) {
      return res.status(404).json({ message: "URL not found or unauthorized" });
    }

    url.longUrl = longUrl;
    await url.save();
    res.json(url);
  } catch (err) {
    res.status(500).json({ message: "Error updating URL" });
  }
});

// Delete shortened URL (PROTECTED)
app.delete("/url/:id", auth, async (req, res) => {
  try {
    const url = await Url.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!url) {
      return res.status(404).json({ message: "URL not found or unauthorized" });
    }
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting URL" });
  }
});

/* ---------------------------
   PUBLIC STATS ENDPOINT
----------------------------*/
app.get("/api/public/stats/:shortCode", async (req, res) => {
  try {
    const { shortCode } = req.params;
    const url = await Url.findOne({ shortCode }).select("longUrl shortCode clickCount lastVisited visitHistory createdAt expiresAt");
    if (!url) {
      return res.status(404).json({ message: "Short link not found" });
    }
    const isExpired = url.expiresAt && new Date() > url.expiresAt;
    res.json({
      longUrl: url.longUrl,
      shortCode: url.shortCode,
      clickCount: url.clickCount,
      lastVisited: url.lastVisited,
      visitHistory: url.visitHistory,
      createdAt: url.createdAt,
      isExpired
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching public link statistics" });
  }
});

/* ---------------------------
   REDIRECT + ANALYTICS
----------------------------*/
app.get("/:shortCode", async (req, res) => {
  try {
    const { shortCode } = req.params;

    const url = await Url.findOne({ shortCode });

    if (!url) {
      return res.status(404).send(getStyledErrorHtml("URL Not Found", "The link you are trying to reach does not exist in our system. Please check the URL and try again."));
    }

    // Check expiry
    if (url.expiresAt && new Date() > url.expiresAt) {
      return res.status(410).send(getStyledErrorHtml("Link Expired", "This short link has reached its expiration date and is no longer active."));
    }

    // Extract device, browser, IP info
    const userAgent = req.headers["user-agent"];
    const { browser, device } = getDeviceInfo(userAgent);
    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown";
    const ip = rawIp.split(",")[0].trim();

    // Geolocation Lookup (ip-api)
    let country = "Unknown";
    let region = "Unknown";
    let city = "Unknown";

    const isLocalIp = ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.16.");
    
    if (ip && ip !== "Unknown" && !isLocalIp) {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
        const geoData = await geoRes.json();
        if (geoData && geoData.status === "success") {
          country = geoData.country || "Unknown";
          region = geoData.regionName || "Unknown";
          city = geoData.city || "Unknown";
        }
      } catch (err) {
        console.error("Geolocation fetch failed:", err.message);
      }
    } else if (isLocalIp) {
      country = "Localhost";
      region = "Localhost";
      city = "Localhost";
    }

    // Extract Referrer info
    let referrer = "Direct";
    const refHeader = req.headers["referer"] || req.headers["referrer"];
    if (refHeader) {
      try {
        const refUrl = new URL(refHeader);
        referrer = refUrl.hostname || refHeader;
        if (referrer.startsWith("www.")) {
          referrer = referrer.substring(4);
        }
        if (referrer.includes("google")) referrer = "Google";
        else if (referrer.includes("facebook")) referrer = "Facebook";
        else if (referrer.includes("twitter") || referrer.includes("t.co")) referrer = "Twitter/X";
        else if (referrer.includes("linkedin")) referrer = "LinkedIn";
        else if (referrer.includes("github")) referrer = "GitHub";
        else if (referrer.includes("reddit")) referrer = "Reddit";
      } catch (err) {
        referrer = refHeader;
      }
    }

    // Update analytics tracking atomically to ensure consistency and correctness
    await Url.findOneAndUpdate(
      { _id: url._id },
      {
        $inc: { clickCount: 1 },
        $set: { lastVisited: new Date() },
        $push: {
          visitHistory: {
            timestamp: new Date(),
            browser,
            device,
            ip,
            country,
            region,
            city,
            referrer
          }
        }
      }
    );

    return res.redirect(url.longUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send(getStyledErrorHtml("Server Error", "An error occurred while redirecting you. Please try again later."));
  }
});

/* ---------------------------
   START SERVER
----------------------------*/


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
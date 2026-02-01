const express = require("express");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
app.use(express.json());

if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  throw new Error("❌ FIREBASE_SERVICE_ACCOUNT is missing from .env");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// 🔑 THIS IS THE KEY FIX
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function verifyAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.sendStatus(401);

    const token = authHeader.replace("Bearer ", "");
    const decoded = await admin.auth().verifyIdToken(token);

    const userSnap = await db.collection("users").doc(decoded.uid).get();
    if (!userSnap.exists || userSnap.data().isAdmin !== true) {
      return res.sendStatus(403);
    }

    next();
  } catch {
    return res.sendStatus(401);
  }
}

app.post("/send-announcement", verifyAdmin, async (req, res) => {
  try {
    const { title, body } = req.body;

    const usersSnap = await db.collection("users").get();
    const tokens = usersSnap.docs
      .map((d) => d.data().pushToken)
      .filter(Boolean);

    if (!tokens.length) {
      return res.json({ success: true, sent: 0 });
    }

    const messages = tokens.map((token) => ({
      to: token,
      sound: "default",
      title,
      body,
    }));

    const chunks = chunkArray(messages, 100);

    for (const chunk of chunks) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
    }

    res.json({ success: true, sent: tokens.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

app.listen(3000, () => {
  console.log("🚀 Push server running on http://localhost:3000");
});
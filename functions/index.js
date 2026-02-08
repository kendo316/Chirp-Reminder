const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

const { getRecentSightings, getCachedSightings } = require("./ebirdService");
const { sendDigestEmail } = require("./emailService");
const { getSeasonalTip, getMaintenanceReminder, getWeekOfYear } = require("./contentService");

admin.initializeApp();
const db = admin.firestore();

// ─── ZIP → eBird Region Mapping ──────────────────────────────────────────────

const ZIP_REGION_MAP = [
  { zipStart: "652", region: "Central Missouri", ebirdRegion: "US-MO-019" },
  { zipStart: "641", region: "Kansas City Metro", ebirdRegion: "US-MO-095" },
  { zipStart: "630", region: "Eastern Missouri", ebirdRegion: "US-MO-099" },
];

function mapZipToRegion(zipCode) {
  const zip = String(zipCode).trim();
  for (const entry of ZIP_REGION_MAP) {
    if (zip.startsWith(entry.zipStart)) {
      return { region: entry.region, ebirdRegion: entry.ebirdRegion };
    }
  }
  // Default to Boone County if no match
  return { region: "Central Missouri", ebirdRegion: "US-MO-019" };
}

// ─── Express App for API ─────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// --- Public: User Signup ---

app.post("/api/signup", async (req, res) => {
  try {
    const { email, zipCode } = req.body;

    if (!email || !zipCode) {
      return res.status(400).json({ error: "Email and zip code are required." });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    const zipRegex = /^\d{5}$/;
    if (!zipRegex.test(zipCode)) {
      return res.status(400).json({ error: "Please enter a valid 5-digit zip code." });
    }

    // Check if user already exists
    const existing = await db.collection("users").where("email", "==", email).limit(1).get();
    if (!existing.empty) {
      const existingDoc = existing.docs[0];
      if (existingDoc.data().active) {
        return res.status(409).json({ error: "This email is already subscribed." });
      }
      // Reactivate if previously unsubscribed
      await existingDoc.ref.update({ active: true, zipCode, ...mapZipToRegion(zipCode) });
      return res.json({ message: "Welcome back! Your subscription has been reactivated." });
    }

    const { region, ebirdRegion } = mapZipToRegion(zipCode);

    await db.collection("users").add({
      email,
      zipCode,
      region,
      ebirdRegion,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      active: true,
    });

    return res.json({ message: "You're signed up! Expect your first digest next Monday morning." });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

// --- Public: Unsubscribe ---

app.get("/api/unsubscribe", async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) {
      return res.status(400).send("Missing user ID.");
    }

    const userRef = db.collection("users").doc(uid);
    const user = await userRef.get();

    if (!user.exists) {
      return res.status(404).send("User not found.");
    }

    await userRef.update({ active: false });

    return res.send(`
      <!DOCTYPE html>
      <html><head><title>Unsubscribed - ChirpReminder</title>
      <style>body{font-family:Georgia,serif;text-align:center;padding:60px 20px;background:#f5f0e8;}
      h1{color:#2d5016;}p{color:#555;font-size:18px;}</style></head>
      <body><h1>You've been unsubscribed</h1>
      <p>We're sorry to see you go. You won't receive any more digests from ChirpReminder.</p>
      <p style="font-size:14px;color:#888;margin-top:40px;">Changed your mind? Just sign up again at our website.</p>
      </body></html>
    `);
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return res.status(500).send("Something went wrong.");
  }
});

// ─── Admin API (protected by Firebase Auth token) ────────────────────────────

async function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// List all subscribers
app.get("/api/admin/subscribers", verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection("users").orderBy("createdAt", "desc").get();
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json(users);
  } catch (err) {
    console.error("Admin subscribers error:", err);
    return res.status(500).json({ error: "Failed to fetch subscribers." });
  }
});

// Toggle user active status
app.post("/api/admin/subscribers/:id/toggle", verifyAdmin, async (req, res) => {
  try {
    const userRef = db.collection("users").doc(req.params.id);
    const user = await userRef.get();
    if (!user.exists) return res.status(404).json({ error: "User not found." });

    await userRef.update({ active: !user.data().active });
    return res.json({ active: !user.data().active });
  } catch (err) {
    console.error("Toggle error:", err);
    return res.status(500).json({ error: "Failed to toggle user." });
  }
});

// List seasonal tips
app.get("/api/admin/tips", verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection("seasonalTips").orderBy("weekOfYear").get();
    const tips = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json(tips);
  } catch (err) {
    console.error("Tips fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch tips." });
  }
});

// Add or update a seasonal tip
app.post("/api/admin/tips", verifyAdmin, async (req, res) => {
  try {
    const { id, weekOfYear, climateZone, title, content, category } = req.body;
    const data = { weekOfYear, climateZone, title, content, category };

    if (id) {
      await db.collection("seasonalTips").doc(id).update(data);
      return res.json({ id, ...data });
    }

    const ref = await db.collection("seasonalTips").add(data);
    return res.json({ id: ref.id, ...data });
  } catch (err) {
    console.error("Tip save error:", err);
    return res.status(500).json({ error: "Failed to save tip." });
  }
});

// Delete a seasonal tip
app.delete("/api/admin/tips/:id", verifyAdmin, async (req, res) => {
  try {
    await db.collection("seasonalTips").doc(req.params.id).delete();
    return res.json({ deleted: true });
  } catch (err) {
    console.error("Tip delete error:", err);
    return res.status(500).json({ error: "Failed to delete tip." });
  }
});

// Get email send logs
app.get("/api/admin/logs", verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db
      .collection("emailLogs")
      .orderBy("sentAt", "desc")
      .limit(100)
      .get();
    const logs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return res.json(logs);
  } catch (err) {
    console.error("Logs fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch logs." });
  }
});

// Trigger manual test send for a specific user
app.post("/api/admin/test-send/:userId", verifyAdmin, async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.params.userId).get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found." });

    const user = userDoc.data();
    const result = await sendDigestToUser(userDoc.id, user);
    return res.json(result);
  } catch (err) {
    console.error("Test send error:", err);
    return res.status(500).json({ error: `Test send failed: ${err.message}` });
  }
});

// ─── Core Digest Logic ──────────────────────────────────────────────────────

async function sendDigestToUser(userId, user) {
  const ebirdApiKey = process.env.EBIRD_API_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const baseUrl = process.env.BASE_URL || "https://chirp-reminder.web.app";

  if (!ebirdApiKey) throw new Error("EBIRD_API_KEY not configured");
  if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

  // Fetch bird sightings (with fallback to cache)
  let sightings;
  try {
    sightings = await getRecentSightings(user.ebirdRegion, ebirdApiKey);
  } catch (err) {
    console.warn(`eBird API failed for ${user.ebirdRegion}, using cache:`, err.message);
    sightings = await getCachedSightings(user.ebirdRegion);
  }

  if (!sightings || sightings.length === 0) {
    sightings = [
      { comName: "Northern Cardinal", sciName: "Cardinalis cardinalis", reportCount: 0, latestDate: "" },
      { comName: "Blue Jay", sciName: "Cyanocitta cristata", reportCount: 0, latestDate: "" },
      { comName: "American Robin", sciName: "Turdus migratorius", reportCount: 0, latestDate: "" },
      { comName: "Black-capped Chickadee", sciName: "Poecile atricapillus", reportCount: 0, latestDate: "" },
      { comName: "House Finch", sciName: "Haemorhous mexicanus", reportCount: 0, latestDate: "" },
    ];
  }

  // Get seasonal tip
  const weekOfYear = getWeekOfYear(new Date());
  const tip = await getSeasonalTip(weekOfYear, "6a");

  // Get maintenance reminder
  const maintenanceReminder = getMaintenanceReminder(weekOfYear);

  // Build unsubscribe URL
  const unsubscribeUrl = `${baseUrl}/api/unsubscribe?uid=${userId}`;

  // Send email
  const result = await sendDigestEmail(resendApiKey, {
    to: user.email,
    sightings,
    tip,
    maintenanceReminder,
    unsubscribeUrl,
  });

  // Log the send
  await db.collection("emailLogs").add({
    userId,
    email: user.email,
    region: user.region,
    status: "success",
    resendId: result?.id || null,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { status: "success", email: user.email, resendId: result?.id };
}

// ─── Scheduled Function: Weekly Digest ──────────────────────────────────────

// Runs every Sunday at 11pm CST (5am UTC Monday)
exports.weeklyDigest = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 5 * * 1")
  .timeZone("America/Chicago")
  .onRun(async () => {
    console.log("Starting weekly digest send...");

    const activeUsers = await db.collection("users").where("active", "==", true).get();
    console.log(`Found ${activeUsers.size} active subscribers`);

    let successCount = 0;
    let failCount = 0;

    for (const doc of activeUsers.docs) {
      const user = doc.data();
      try {
        await sendDigestToUser(doc.id, user);
        successCount++;
        console.log(`Sent digest to ${user.email}`);
      } catch (err) {
        failCount++;
        console.error(`Failed to send to ${user.email}:`, err.message);

        // Log the failure
        await db.collection("emailLogs").add({
          userId: doc.id,
          email: user.email,
          region: user.region,
          status: "failed",
          error: err.message,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    console.log(`Digest complete: ${successCount} sent, ${failCount} failed`);
    return null;
  });

// ─── Export Express App as Cloud Function ────────────────────────────────────

exports.api = functions.https.onRequest(app);

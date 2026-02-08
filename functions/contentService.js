const admin = require("firebase-admin");

/**
 * Get a seasonal tip matching the current week and climate zone.
 * Falls back to the closest available week if no exact match exists.
 */
async function getSeasonalTip(weekOfYear, climateZone) {
  const db = admin.firestore();

  // Try exact match first
  let snapshot = await db
    .collection("seasonalTips")
    .where("weekOfYear", "==", weekOfYear)
    .where("climateZone", "==", climateZone)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return snapshot.docs[0].data();
  }

  // Fall back: find the closest week tip for this climate zone
  const allTips = await db
    .collection("seasonalTips")
    .where("climateZone", "==", climateZone)
    .get();

  if (allTips.empty) {
    return getDefaultTip();
  }

  let closest = null;
  let closestDist = Infinity;
  for (const doc of allTips.docs) {
    const tip = doc.data();
    const dist = Math.min(
      Math.abs(tip.weekOfYear - weekOfYear),
      52 - Math.abs(tip.weekOfYear - weekOfYear)
    );
    if (dist < closestDist) {
      closestDist = dist;
      closest = tip;
    }
  }

  return closest || getDefaultTip();
}

/**
 * Get a maintenance reminder based on the current week.
 * Rotates through a set of common maintenance tasks.
 */
function getMaintenanceReminder(weekOfYear) {
  const reminders = [
    "Clean feeders with a 1:9 bleach-to-water solution and rinse thoroughly.",
    "Check seed levels in all feeders and top off as needed.",
    "Inspect feeders for damage or mold - replace any compromised parts.",
    "Scrub and refill your birdbath with fresh water.",
    "Rake up fallen seed hulls under feeders to prevent mold growth.",
    "Check suet feeders - replace suet if it looks dried out or rancid.",
    "Trim branches near feeders if squirrels are jumping onto them.",
    "Rotate feeder positions occasionally to reduce ground buildup.",
    "Inspect window strike guards and clean glass near feeding areas.",
    "Oil any squeaky hooks or hangers to keep feeders steady in wind.",
    "Wash hummingbird feeders and make fresh nectar (4:1 water to sugar).",
    "Check that feeder baffles are still in place and working properly.",
  ];

  return reminders[weekOfYear % reminders.length];
}

function getDefaultTip() {
  return {
    title: "Keep Your Feeders Clean",
    content:
      "Regular cleaning prevents disease spread among visiting birds. Clean feeders every 1-2 weeks with a dilute bleach solution, rinse well, and let dry completely before refilling.",
    category: "maintenance",
  };
}

/**
 * Get the current ISO week number.
 */
function getWeekOfYear(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

module.exports = {
  getSeasonalTip,
  getMaintenanceReminder,
  getWeekOfYear,
};

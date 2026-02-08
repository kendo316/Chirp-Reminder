/**
 * Seed script for ChirpReminder Firestore data.
 *
 * Usage:
 *   Set GOOGLE_APPLICATION_CREDENTIALS to your service account key, then run:
 *     node scripts/seedData.js
 *
 *   Or run inside Firebase emulator:
 *     FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/seedData.js
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS or emulator)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ─── Region Mappings ─────────────────────────────────────────────────────────

const regionMappings = [
  {
    id: "columbia-mo",
    zipPrefix: "652",
    zipExamples: "65201-65299",
    city: "Columbia",
    state: "MO",
    county: "Boone County",
    region: "Central Missouri",
    ebirdRegion: "US-MO-019",
    climateZone: "6a",
  },
  {
    id: "raytown-mo",
    zipPrefix: "641",
    zipExamples: "64133-64138",
    city: "Raytown",
    state: "MO",
    county: "Jackson County",
    region: "Kansas City Metro",
    ebirdRegion: "US-MO-095",
    climateZone: "6a",
  },
  {
    id: "pacific-mo",
    zipPrefix: "630",
    zipExamples: "63069",
    city: "Pacific",
    state: "MO",
    county: "Franklin County",
    region: "Eastern Missouri",
    ebirdRegion: "US-MO-071",
    climateZone: "6a",
  },
];

// ─── Seasonal Tips (12 monthly tips) ─────────────────────────────────────────

const seasonalTips = [
  {
    weekOfYear: 3,
    climateZone: "6a",
    title: "January: Suet Is Your Best Friend",
    content:
      "In the coldest weeks, suet cakes provide essential fat and calories for birds. Hang suet feeders in sheltered spots away from wind. Woodpeckers, nuthatches, and chickadees will thank you.",
    category: "feeding",
  },
  {
    weekOfYear: 6,
    climateZone: "6a",
    title: "Late Winter High-Energy Feeding",
    content:
      "Birds burn through calories fast in late winter cold snaps. Stock feeders with black oil sunflower seeds and suet cakes. Consider adding peanuts and nyjer seed for extra variety. Keep feeders full - birds depend on reliable food sources in February.",
    category: "feeding",
  },
  {
    weekOfYear: 10,
    climateZone: "6a",
    title: "March: Early Spring Transition",
    content:
      "As winter breaks, early migrants start arriving. Maintain your winter feeding stations but start watching for new species. Clean feeders thoroughly to prevent disease spread from winter buildup.",
    category: "maintenance",
  },
  {
    weekOfYear: 15,
    climateZone: "6a",
    title: "Spring Nesting Season Protein",
    content:
      "Breeding birds need extra protein for egg production and feeding chicks. Offer mealworms (live or dried) alongside your regular seed mix. Avoid trimming hedges and shrubs where birds may be nesting. Put out nesting material like pet fur, short yarn pieces, or dried grass.",
    category: "feeding",
  },
  {
    weekOfYear: 19,
    climateZone: "6a",
    title: "May: Peak Migration Feeding",
    content:
      "May brings a wave of migrating warblers, tanagers, and orioles through Missouri. Put out orange halves and grape jelly for orioles. A simple sugar-water feeder (4:1 ratio) will attract hummingbirds arriving from the south.",
    category: "feeding",
  },
  {
    weekOfYear: 23,
    climateZone: "6a",
    title: "June: Fledgling Season Care",
    content:
      "Young birds are leaving nests and learning to feed. You may see awkward juveniles at your feeders - this is normal. Keep cats indoors during fledgling season. Offer a variety of food sizes, including smaller seeds for tiny beaks.",
    category: "general",
  },
  {
    weekOfYear: 28,
    climateZone: "6a",
    title: "Summer Water Source Maintenance",
    content:
      "In July heat, fresh water is more important than food. Clean and refill birdbaths daily - standing water breeds mosquitoes and bacteria. Add a dripper or small fountain to attract birds with the sound of moving water. Place baths in shade to keep water cool.",
    category: "maintenance",
  },
  {
    weekOfYear: 32,
    climateZone: "6a",
    title: "August: Feeder Hygiene in Heat",
    content:
      "Hot humid weather means faster mold and bacteria growth. Clean all feeders weekly with a 1:9 bleach solution. Remove and replace seed that has gotten wet or clumped. Hummingbird nectar spoils quickly in heat - change it every 2-3 days.",
    category: "maintenance",
  },
  {
    weekOfYear: 36,
    climateZone: "6a",
    title: "September: Migration Prep",
    content:
      "Fall migration is underway. Increase food availability to help birds fuel up for their journeys. Keep hummingbird feeders up through September - late migrants need the energy. This is a great time to see unusual species passing through.",
    category: "feeding",
  },
  {
    weekOfYear: 40,
    climateZone: "6a",
    title: "October: Seed Variety Matters",
    content:
      "As winter residents settle in, diversify your offerings. Black oil sunflower attracts the widest range of species. Add safflower (cardinals love it, squirrels don't), nyjer for finches, and white millet for ground-feeding sparrows and juncos.",
    category: "feeding",
  },
  {
    weekOfYear: 45,
    climateZone: "6a",
    title: "November: Winter Prep for Feeders",
    content:
      "Before hard freezes arrive, inspect and repair all feeders. Check that drainage holes are clear so seed stays dry. Move feeders closer to sheltered areas like evergreen trees. Stock up on seed - you'll use much more in winter.",
    category: "maintenance",
  },
  {
    weekOfYear: 50,
    climateZone: "6a",
    title: "December: Keep Water Unfrozen",
    content:
      "Open water in winter is a magnet for birds. Use a birdbath heater or heated birdbath to prevent freezing. Never add antifreeze or chemicals. Even on the coldest days, birds need to drink and bathe to maintain their feather insulation.",
    category: "maintenance",
  },
];

// ─── Seed Functions ──────────────────────────────────────────────────────────

async function seedRegionMappings() {
  console.log("Seeding region mappings...");
  const batch = db.batch();

  for (const mapping of regionMappings) {
    const ref = db.collection("regionMappings").doc(mapping.id);
    batch.set(ref, mapping);
  }

  await batch.commit();
  console.log(`  Seeded ${regionMappings.length} region mappings.`);
}

async function seedSeasonalTips() {
  console.log("Seeding seasonal tips...");
  const batch = db.batch();

  for (const tip of seasonalTips) {
    const ref = db.collection("seasonalTips").doc();
    batch.set(ref, tip);
  }

  await batch.commit();
  console.log(`  Seeded ${seasonalTips.length} seasonal tips.`);
}

async function main() {
  console.log("=== ChirpReminder Data Seed ===\n");

  try {
    await seedRegionMappings();
    await seedSeasonalTips();
    console.log("\nSeed complete.");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }

  process.exit(0);
}

main();

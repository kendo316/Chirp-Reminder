const fetch = require("node-fetch");
const admin = require("firebase-admin");

const EBIRD_BASE_URL = "https://api.ebird.org/v2";

/**
 * Fetch recent notable observations for a given eBird region code.
 * Results are cached in Firestore for 24 hours to avoid excessive API calls.
 */
async function getRecentSightings(regionCode, apiKey) {
  const db = admin.firestore();
  const cacheRef = db.collection("ebirdCache").doc(regionCode);

  // Check cache first
  const cached = await cacheRef.get();
  if (cached.exists) {
    const data = cached.data();
    const cacheAge = Date.now() - data.fetchedAt.toMillis();
    const ONE_DAY = 24 * 60 * 60 * 1000;
    if (cacheAge < ONE_DAY) {
      return data.sightings;
    }
  }

  // Fetch from eBird API
  const sightings = await fetchFromEbird(regionCode, apiKey);

  // Cache the results
  await cacheRef.set({
    regionCode,
    sightings,
    fetchedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return sightings;
}

/**
 * Call the eBird API for recent observations in a region.
 * Returns the top 5 most-reported species from the past 7 days.
 */
async function fetchFromEbird(regionCode, apiKey) {
  const url = `${EBIRD_BASE_URL}/data/obs/${regionCode}/recent?back=7&maxResults=50`;

  const response = await fetch(url, {
    headers: {
      "X-eBirdApiToken": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`eBird API error: ${response.status} ${response.statusText}`);
  }

  const observations = await response.json();

  // Aggregate by species and pick the top 5 most-reported
  const speciesCounts = {};
  for (const obs of observations) {
    const key = obs.speciesCode;
    if (!speciesCounts[key]) {
      speciesCounts[key] = {
        speciesCode: obs.speciesCode,
        comName: obs.comName,
        sciName: obs.sciName,
        count: 0,
        latestDate: obs.obsDt,
      };
    }
    speciesCounts[key].count += 1;
    if (obs.obsDt > speciesCounts[key].latestDate) {
      speciesCounts[key].latestDate = obs.obsDt;
    }
  }

  const sorted = Object.values(speciesCounts).sort((a, b) => b.count - a.count);
  return sorted.slice(0, 5).map((s) => ({
    comName: s.comName,
    sciName: s.sciName,
    reportCount: s.count,
    latestDate: s.latestDate,
  }));
}

/**
 * Get cached sightings as a fallback when the API is unavailable.
 */
async function getCachedSightings(regionCode) {
  const db = admin.firestore();
  const cached = await db.collection("ebirdCache").doc(regionCode).get();
  if (cached.exists) {
    return cached.data().sightings;
  }
  return null;
}

module.exports = {
  getRecentSightings,
  fetchFromEbird,
  getCachedSightings,
};

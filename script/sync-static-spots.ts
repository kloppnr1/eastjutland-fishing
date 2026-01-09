import fs from "fs";
import path from "path";

const SPOTS_JSON = path.resolve(import.meta.dirname, "../data/spots.json");
const SPOTS_TS = path.resolve(import.meta.dirname, "../client/src/data/spots.ts");

interface Spot {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  description: string;
  spotType: string | null;
  bestFor: string;
  imageUrl: string | null;
  webcamUrl: string | null;
  timelapseUrl: string | null;
  currentWaterTemp: number | null;
  lastUpdated: string | null;
}

function syncSpots() {
  // Read current spots from JSON
  if (!fs.existsSync(SPOTS_JSON)) {
    console.error("Error: data/spots.json not found");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(SPOTS_JSON, "utf-8"));
  const spots: Spot[] = data.spots || [];

  // Generate TypeScript file
  const tsContent = `import type { FishingSpot } from "@shared/schema";

// Auto-generated from data/spots.json - DO NOT EDIT MANUALLY
// Run: npm run sync:spots to update

export const BUNDLED_SPOTS: FishingSpot[] = ${JSON.stringify(
    spots.map((spot) => ({
      id: spot.id,
      name: spot.name,
      latitude: spot.latitude,
      longitude: spot.longitude,
      description: spot.description,
      spotType: spot.spotType || "fishing",
      bestFor: spot.bestFor,
      imageUrl: spot.imageUrl,
      webcamUrl: spot.webcamUrl || null,
      timelapseUrl: spot.timelapseUrl || null,
      currentWaterTemp: null,
      currentAirTemp: null,
      windSpeed: null,
      windDirection: null,
      lastUpdated: null,
    })),
    null,
    2
  )};
`;

  fs.writeFileSync(SPOTS_TS, tsContent, "utf-8");
  console.log(`Synced ${spots.length} spots to client/src/data/spots.ts`);
}

syncSpots();

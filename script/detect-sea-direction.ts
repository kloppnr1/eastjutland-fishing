import { Jimp } from "jimp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OpenStreetMap water color is approximately #aad3df (RGB: 170, 211, 223)
// We'll check if a pixel is "water blue"
function isWaterColor(r: number, g: number, b: number): boolean {
  // Water in OSM tiles is typically light blue
  // Check if it's in the blue-ish range and not too dark
  const isBlueish = b > r && b > g * 0.8;
  const isLight = r > 100 && g > 150 && b > 180;
  const isWaterBlue = Math.abs(r - 170) < 50 && Math.abs(g - 211) < 50 && Math.abs(b - 223) < 50;
  return isWaterBlue || (isBlueish && isLight);
}

// Convert lat/lng to tile coordinates at a given zoom level
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number; pixelX: number; pixelY: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);

  // Calculate pixel position within the tile (tiles are 256x256)
  const pixelX = Math.floor(((lng + 180) / 360 * n - x) * 256);
  const pixelY = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n - y) * 256);

  return { x, y, pixelX, pixelY };
}

// Sample pixels in a direction from a point
function sampleDirection(
  image: Jimp,
  startX: number,
  startY: number,
  angle: number, // 0 = north, 90 = east, etc.
  sampleCount: number = 20,
  stepSize: number = 5
): number {
  let waterPixels = 0;

  // Convert angle to radians (0 = up/north in image coordinates)
  const radians = (angle - 90) * Math.PI / 180; // -90 because image Y is inverted

  for (let i = 1; i <= sampleCount; i++) {
    const distance = i * stepSize;
    const sampleX = Math.round(startX + Math.cos(radians) * distance);
    const sampleY = Math.round(startY - Math.sin(radians) * distance); // Negative because Y grows downward

    // Check bounds
    if (sampleX < 0 || sampleX >= image.width || sampleY < 0 || sampleY >= image.height) {
      continue;
    }

    const color = image.getPixelColor(sampleX, sampleY);
    // Extract RGBA from 32-bit integer (ABGR format)
    const r = (color >> 24) & 0xff;
    const g = (color >> 16) & 0xff;
    const b = (color >> 8) & 0xff;

    if (isWaterColor(r, g, b)) {
      waterPixels++;
    }
  }

  return waterPixels;
}

// Detect sea direction for a spot
async function detectSeaDirection(lat: number, lng: number, name: string): Promise<number | null> {
  const zoom = 14; // Good zoom level for coastal detection
  const tile = latLngToTile(lat, lng, zoom);

  const tileUrl = `https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`;

  console.log(`  Fetching tile for ${name}: ${tileUrl}`);
  console.log(`  Pixel position in tile: (${tile.pixelX}, ${tile.pixelY})`);

  try {
    const image = await Jimp.read(tileUrl);

    // Sample in 8 directions (every 45 degrees)
    const directions = [
      { angle: 0, name: "N" },
      { angle: 45, name: "NE" },
      { angle: 90, name: "E" },
      { angle: 135, name: "SE" },
      { angle: 180, name: "S" },
      { angle: 225, name: "SW" },
      { angle: 270, name: "W" },
      { angle: 315, name: "NW" },
    ];

    let maxWater = 0;
    let seaDirection: number | null = null;

    console.log(`  Water pixels by direction:`);
    for (const dir of directions) {
      const waterCount = sampleDirection(image, tile.pixelX, tile.pixelY, dir.angle);
      console.log(`    ${dir.name} (${dir.angle}°): ${waterCount} water pixels`);

      if (waterCount > maxWater) {
        maxWater = waterCount;
        seaDirection = dir.angle;
      }
    }

    if (maxWater < 3) {
      console.log(`  Warning: Very few water pixels detected, might be inland`);
      return null;
    }

    console.log(`  Detected sea direction: ${seaDirection}° (${maxWater} water pixels)`);
    return seaDirection;

  } catch (err) {
    console.error(`  Error fetching tile: ${err}`);
    return null;
  }
}

async function main() {
  // Read spots.json
  const spotsPath = path.join(__dirname, "..", "data", "spots.json");
  const spotsData = JSON.parse(fs.readFileSync(spotsPath, "utf-8"));

  console.log("Detecting sea direction for fishing spots...\n");

  for (const spot of spotsData.spots) {
    // Skip webcam spots
    if (spot.spotType === "webcam") {
      console.log(`Skipping webcam: ${spot.name}`);
      continue;
    }

    console.log(`Processing: ${spot.name}`);
    const lat = parseFloat(spot.latitude);
    const lng = parseFloat(spot.longitude);

    const seaDir = await detectSeaDirection(lat, lng, spot.name);

    if (seaDir !== null) {
      spot.seaDirection = seaDir;
    }

    console.log("");

    // Small delay to be nice to the tile server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Write updated spots.json
  fs.writeFileSync(spotsPath, JSON.stringify(spotsData, null, 2));
  console.log("Updated spots.json with detected sea directions");
}

main().catch(console.error);

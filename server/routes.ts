import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import multer from "multer";
import path from "path";
import express from "express";

// Configure multer for image uploads
const uploadStorage = multer.diskStorage({
  destination: path.resolve(import.meta.dirname, "..", "uploads"),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    const allowedExts = /\.(jpeg|jpg|png|webp)$/i;

    const extOk = allowedExts.test(file.originalname);
    const mimeOk = allowedMimes.includes(file.mimetype);

    if (extOk || mimeOk) {
      cb(null, true);
    } else {
      cb(new Error(`Only images allowed (jpg, png, webp). Got: ${file.mimetype}`));
    }
  },
});

// Østjylland fiskesteder (verificerede koordinater)
const INITIAL_SPOTS = [
  // Djursland
  {
    name: "Jernhatten",
    latitude: "56.2449",
    longitude: "10.7869",
    description: "Legendarisk revsted med stærk strøm. Dybt vand tæt på kysten.",
    bestFor: "Havørred, Torsk, Makrel",
  },
  {
    name: "Rugård",
    latitude: "56.2680",
    longitude: "10.7950",
    description: "Kendt for store havørreder, påvirket af varmere vand fra Hjelm Dyb.",
    bestFor: "Store Havørreder, Hornfisk",
  },
  {
    name: "Grenaa (Fornæs)",
    latitude: "56.4500",
    longitude: "10.9600",
    description: "Jyllands østligste punkt. Kalkrev og varieret bund.",
    bestFor: "Torsk, Fladfisk, Havørred",
  },
  {
    name: "Bønnerup Havn",
    latitude: "56.5193",
    longitude: "10.7202",
    description: "Havn- og strandfiskeri på nordkysten.",
    bestFor: "Fladfisk, Sæsonmakrel",
  },
  {
    name: "Gjerrild Klint",
    latitude: "56.5150",
    longitude: "10.8639",
    description: "Dybt vand og varierede strømforhold ved klinterne.",
    bestFor: "Havørred, Torsk",
  },
  {
    name: "Sletterhage",
    latitude: "56.0951",
    longitude: "10.5129",
    description: "Sydspidsen af Helgenæs-halvøen. Klippekyst med adgang til dybt vand.",
    bestFor: "Havørred, Torsk, Hornfisk",
  },
  {
    name: "Begtrup Vig",
    latitude: "56.1400",
    longitude: "10.4900",
    description: "Beskyttet vig på Helgenæs. God for begyndere med sandbund.",
    bestFor: "Fladfisk, Havørred",
  },
  // Aarhus området
  {
    name: "Aarhus Havn (Østhavnen)",
    latitude: "56.1550",
    longitude: "10.2280",
    description: "Byfiskeri ved Aarhus Østhavn. Nem adgang fra bycentrum.",
    bestFor: "Sild, Makrel, Hornfisk",
  },
  {
    name: "Ballehage Strand",
    latitude: "56.1295",
    longitude: "10.2120",
    description: "Populær strand syd for Aarhus med gode kystfiskemuligheder.",
    bestFor: "Havørred, Fladfisk",
  },
  {
    name: "Moesgård Strand",
    latitude: "56.0630",
    longitude: "10.2250",
    description: "Smuk strand nær Moesgård Museum. Blandet sand- og stenbund.",
    bestFor: "Havørred, Hornfisk, Fladfisk",
  },
  {
    name: "Norsminde Fjord",
    latitude: "56.0200",
    longitude: "10.2550",
    description: "Lavvandet fjord syd for Aarhus. Fremragende til vadning og fluefiskeri.",
    bestFor: "Havørred, Hornfisk",
  },
  {
    name: "Risskov Strand",
    latitude: "56.1870",
    longitude: "10.2330",
    description: "Nord for Aarhus by. Lavt vand med ålegræsbede.",
    bestFor: "Havørred, Hornfisk",
  },
  {
    name: "Egå Marina",
    latitude: "56.2103",
    longitude: "10.2884",
    description: "Marina med molefiskeri og nærliggende strand. Familievenligt sted.",
    bestFor: "Fladfisk, Sild, Makrel",
  },
  // Kalø Vig området
  {
    name: "Kalø Slotsruin",
    latitude: "56.2745",
    longitude: "10.4672",
    description: "Historiske slotsruiner med fremragende vademuligheder. Lavvandede flader perfekte til fluefiskeri.",
    bestFor: "Havørred, Hornfisk",
  },
  {
    name: "Kalø Vig (Nappedam)",
    latitude: "56.2768",
    longitude: "10.4945",
    description: "Beskyttet vig med ålegræsbede. Populært sted for havørred i forår og efterår.",
    bestFor: "Havørred, Fladfisk, Hornfisk",
  },
  {
    name: "Studstrup Strand",
    latitude: "56.2496",
    longitude: "10.3479",
    description: "Lang sandstrand med gradvis dybde. God til vadning og spinnefiskeri.",
    bestFor: "Havørred, Fladfisk",
  },
  {
    name: "Følle Strand",
    latitude: "56.3020",
    longitude: "10.4450",
    description: "Sandstrand syd for Rønde med udsigt over Kalø Vig. Lavt vand ideelt for familier.",
    bestFor: "Havørred, Fladfisk, Hornfisk",
  },
  // Gammel Løgten området
  {
    name: "Gammel Løgten Strand",
    latitude: "56.2816",
    longitude: "10.3857",
    description: "Populær strand mellem Løgten og Skæring. God vadning med blandet sand- og stenbund.",
    bestFor: "Havørred, Hornfisk, Fladfisk",
  },
  // Nord Djursland klinter
  {
    name: "Sangstrup Klint",
    latitude: "56.4732",
    longitude: "10.9120",
    description: "Dramatiske kalkklinter på nordkysten. Dybt vand tæt på kysten med fremragende revfiskeri.",
    bestFor: "Torsk, Havørred, Makrel",
  }
];

// Fetch weather data for coordinates (returns fresh data, no caching)
async function fetchWeather(latitude: string, longitude: string) {
  try {
    const [marineRes, weatherRes] = await Promise.all([
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}&current=sea_surface_temperature&timezone=Europe/Copenhagen`),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=Europe/Copenhagen`),
    ]);

    let waterTemp: number | null = null;
    let airTemp: number | null = null;
    let windSpeed: number | null = null;
    let windDirection: number | null = null;
    let lastUpdated: string | null = null;

    if (marineRes.ok) {
      const marineData = await marineRes.json();
      waterTemp = marineData.current?.sea_surface_temperature ?? null;
      if (marineData.current?.time) {
        // Keep as string - already in Danish timezone from API
        lastUpdated = marineData.current.time;
      }
    }

    if (weatherRes.ok) {
      const weatherData = await weatherRes.json();
      airTemp = weatherData.current?.temperature_2m ?? null;
      windSpeed = weatherData.current?.wind_speed_10m ?? null;
      windDirection = weatherData.current?.wind_direction_10m ?? null;
      if (!lastUpdated && weatherData.current?.time) {
        // Keep as string - already in Danish timezone from API
        lastUpdated = weatherData.current.time;
      }
    }

    return { waterTemp, airTemp, windSpeed, windDirection, lastUpdated };
  } catch (err) {
    console.error(`Failed to fetch weather:`, err);
    return { waterTemp: null, airTemp: null, windSpeed: null, windDirection: null, lastUpdated: null };
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Serve uploaded images
  app.use("/uploads", express.static(path.resolve(import.meta.dirname, "..", "uploads")));

  // Seed data if empty
  const existing = await storage.getAllSpots();
  if (existing.length === 0) {
    console.log("Seeding fishing spots...");
    for (const spot of INITIAL_SPOTS) {
      await storage.createSpot(spot);
    }
  }

  // Image upload endpoint with error handling
  app.post("/api/upload", (req, res) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || "Upload fejlede" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Ingen fil uploadet" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ imageUrl });
    });
  });

  app.get(api.spots.list.path, async (_req, res) => {
    const spots = await storage.getAllSpots();

    // Fetch fresh weather for all spots in parallel
    const spotsWithWeather = await Promise.all(
      spots.map(async (spot) => {
        const weather = await fetchWeather(spot.latitude, spot.longitude);
        return {
          ...spot,
          currentWaterTemp: weather.waterTemp,
          currentAirTemp: weather.airTemp,
          windSpeed: weather.windSpeed,
          windDirection: weather.windDirection,
          lastUpdated: weather.lastUpdated,
        };
      })
    );

    res.json(spotsWithWeather);
  });

  app.get(api.spots.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const spot = await storage.getSpot(id);
    if (!spot) {
      return res.status(404).json({ message: "Spot not found" });
    }

    // Fetch fresh weather
    const weather = await fetchWeather(spot.latitude, spot.longitude);
    res.json({
      ...spot,
      currentWaterTemp: weather.waterTemp,
      currentAirTemp: weather.airTemp,
      windSpeed: weather.windSpeed,
      windDirection: weather.windDirection,
      lastUpdated: weather.lastUpdated,
    });
  });

  app.post(api.spots.create.path, async (req, res) => {
    try {
      const { name, latitude, longitude, description, bestFor, imageUrl, webcamUrl } = req.body;
      if (!name || !latitude || !longitude) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      const spot = await storage.createSpot({
        name,
        latitude,
        longitude,
        description,
        bestFor,
        imageUrl: imageUrl || null,
        webcamUrl: webcamUrl || null,
      } as any);

      // Fetch fresh weather for the new spot
      const weather = await fetchWeather(latitude, longitude);
      const response = {
        ...spot,
        currentWaterTemp: weather.waterTemp,
        currentAirTemp: weather.airTemp,
        windSpeed: weather.windSpeed,
        windDirection: weather.windDirection,
        lastUpdated: weather.lastUpdated,
      };
      console.log("Created spot with weather:", response);
      res.status(201).json(response);
    } catch (err) {
      res.status(400).json({ message: "Failed to create spot" });
    }
  });

  // Update spot
  app.put("/api/spots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, bestFor, imageUrl, webcamUrl } = req.body;

      const spot = await storage.updateSpot(id, {
        name,
        description,
        bestFor,
        imageUrl,
        webcamUrl,
      } as any);

      res.json(spot);
    } catch (err) {
      res.status(404).json({ message: "Spot not found" });
    }
  });

  // Delete spot
  app.delete("/api/spots/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSpot(id);

      if (!deleted) {
        return res.status(404).json({ message: "Spot not found" });
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete spot" });
    }
  });

  return httpServer;
}

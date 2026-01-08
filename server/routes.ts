import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";

// Djursland Fishing Spots Data
const INITIAL_SPOTS = [
  {
    name: "Jernhatten",
    latitude: "56.242",
    longitude: "10.785",
    description: "Legendary reef spot with strong currents. Deep water close to shore.",
    bestFor: "Sea Trout, Cod, Mackerel",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Rugård",
    latitude: "56.275",
    longitude: "10.815",
    description: "Known for large sea trout, influenced by warmer water from Hjelm Deep.",
    bestFor: "Large Sea Trout, Garfish",
    imageUrl: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Grenaa (Fornæs)",
    latitude: "56.445",
    longitude: "10.955",
    description: "Easternmost point of Jutland. Limestone reefs and varied bottom.",
    bestFor: "Cod, Flatfish, Sea Trout",
    imageUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Bønnerup Havn",
    latitude: "56.530",
    longitude: "10.715",
    description: "Harbor and beach fishing on the north coast.",
    bestFor: "Flatfish, Seasonal Mackerel",
    imageUrl: "https://images.unsplash.com/photo-1520116468816-95b69f847357?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Natomolen (Ebeltoft)",
    latitude: "56.175",
    longitude: "10.550",
    description: "Famous pier fishing spot, great for seasonal species.",
    bestFor: "Mackerel, Herring, Garfish",
    imageUrl: "https://images.unsplash.com/photo-1544551763-46a42a462691?auto=format&fit=crop&q=80&w=1000"
  },
  {
    name: "Gjerrild Klint",
    latitude: "56.505",
    longitude: "10.835",
    description: "Deep water and varied currents near the cliffs.",
    bestFor: "Sea Trout, Cod",
    imageUrl: "https://images.unsplash.com/photo-1468581264429-2548ef9eb732?auto=format&fit=crop&q=80&w=1000"
  }
];

async function updateTemperatures() {
  console.log("Updating temperatures...");
  const spots = await storage.getAllSpots();
  
  for (const spot of spots) {
    // Basic caching: Don't update if updated less than 1 hour ago
    if (spot.lastUpdated) {
      const hoursSinceUpdate = (new Date().getTime() - new Date(spot.lastUpdated).getTime()) / (1000 * 60 * 60);
      if (hoursSinceUpdate < 1) continue;
    }

    try {
      // Fetch from Open-Meteo Marine API (free, reliable, based on NOAA/Copernicus)
      const res = await fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${spot.latitude}&longitude=${spot.longitude}&current=water_temperature`
      );
      
      if (!res.ok) throw new Error("API call failed");
      
      const data = await res.json();
      const temp = data.current?.water_temperature; // Removed 'any' cast by relying on runtime check or known structure

      if (typeof temp === 'number') {
        await storage.updateSpotTemp(spot.id, temp);
        console.log(`Updated ${spot.name}: ${temp}°C`);
      }
    } catch (err) {
      console.error(`Failed to update temp for ${spot.name}:`, err);
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed data if empty
  const existing = await storage.getAllSpots();
  if (existing.length === 0) {
    console.log("Seeding fishing spots...");
    for (const spot of INITIAL_SPOTS) {
      await storage.createSpot(spot);
    }
  }

  // Initial update
  updateTemperatures(); // Start in background
  setInterval(updateTemperatures, 1000 * 60 * 60); // Update every hour

  app.get(api.spots.list.path, async (_req, res) => {
    const spots = await storage.getAllSpots();
    res.json(spots);
  });

  app.get(api.spots.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const spot = await storage.getSpot(id);
    if (!spot) {
      return res.status(404).json({ message: "Spot not found" });
    }
    res.json(spot);
  });

  return httpServer;
}

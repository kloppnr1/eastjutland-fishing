import { useState, useEffect, useCallback } from "react";
import type { FishingSpot } from "@shared/schema";
import { BUNDLED_SPOTS } from "@/data/spots";

const USER_SPOTS_KEY = "ostjylland-user-spots";
const TEMP_CACHE_KEY = "ostjylland-temp-cache";
const TEMP_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface WeatherCache {
  [spotId: number]: {
    waterTemp: number | null;
    airTemp: number | null;
    windSpeed: number | null;
    windDirection: number | null;
    time: string;
    fetchedAt: number;
  };
}

// Load user spots from localStorage
function loadUserSpots(): FishingSpot[] {
  try {
    const stored = localStorage.getItem(USER_SPOTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error("Failed to load user spots:", err);
  }
  return [];
}

// Save user spots to localStorage
function saveUserSpots(spots: FishingSpot[]) {
  try {
    localStorage.setItem(USER_SPOTS_KEY, JSON.stringify(spots));
  } catch (err) {
    console.error("Failed to save user spots:", err);
  }
}

// Load weather cache from localStorage
function loadWeatherCache(): WeatherCache {
  try {
    const stored = localStorage.getItem(TEMP_CACHE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error("Failed to load weather cache:", err);
  }
  return {};
}

// Save weather cache to localStorage
function saveWeatherCache(cache: WeatherCache) {
  try {
    localStorage.setItem(TEMP_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error("Failed to save weather cache:", err);
  }
}

// Fetch weather from Open-Meteo API (water temp, air temp, wind)
async function fetchWeather(lat: string, lon: string): Promise<{ waterTemp: number | null; airTemp: number | null; windSpeed: number | null; windDirection: number | null; time: string } | null> {
  try {
    const [marineRes, weatherRes] = await Promise.all([
      fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=sea_surface_temperature`),
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=Europe/Copenhagen`),
    ]);

    let waterTemp: number | null = null;
    let airTemp: number | null = null;
    let windSpeed: number | null = null;
    let windDirection: number | null = null;
    let time: string | null = null;

    if (marineRes.ok) {
      const marineData = await marineRes.json();
      waterTemp = marineData.current?.sea_surface_temperature ?? null;
      time = marineData.current?.time ?? null;
    }

    if (weatherRes.ok) {
      const weatherData = await weatherRes.json();
      airTemp = weatherData.current?.temperature_2m ?? null;
      windSpeed = weatherData.current?.wind_speed_10m ?? null;
      windDirection = weatherData.current?.wind_direction_10m ?? null;
      if (!time) time = weatherData.current?.time ?? null;
    }

    if (time && (waterTemp !== null || airTemp !== null)) {
      return { waterTemp, airTemp, windSpeed, windDirection, time };
    }
  } catch (err) {
    console.error("Failed to fetch weather:", err);
  }
  return null;
}

export function useStaticSpots() {
  const [spots, setSpots] = useState<FishingSpot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load and merge spots
  const loadSpots = useCallback(async () => {
    setIsLoading(true);
    try {
      const userSpots = loadUserSpots();
      const weatherCache = loadWeatherCache();
      const now = Date.now();

      // Merge bundled and user spots
      const allSpots = [...BUNDLED_SPOTS, ...userSpots];

      // Apply cached weather data
      const spotsWithWeather = allSpots.map(spot => {
        const cached = weatherCache[spot.id];
        if (cached && (now - cached.fetchedAt) < TEMP_CACHE_DURATION) {
          return {
            ...spot,
            currentWaterTemp: cached.waterTemp,
            currentAirTemp: cached.airTemp,
            windSpeed: cached.windSpeed,
            windDirection: cached.windDirection,
            lastUpdated: cached.time as unknown as Date,
          };
        }
        return spot;
      });

      setSpots(spotsWithWeather.sort((a, b) => a.name.localeCompare(b.name)));
      setError(null);

      // Fetch fresh weather in background
      fetchAllWeather(allSpots, weatherCache);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load spots"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch weather for all spots
  const fetchAllWeather = async (allSpots: FishingSpot[], existingCache: WeatherCache) => {
    const now = Date.now();
    const newCache: WeatherCache = { ...existingCache };
    let updated = false;

    for (const spot of allSpots) {
      const cached = existingCache[spot.id];
      // Skip if recently fetched
      if (cached && (now - cached.fetchedAt) < TEMP_CACHE_DURATION) {
        continue;
      }

      const result = await fetchWeather(spot.latitude, spot.longitude);
      if (result) {
        newCache[spot.id] = {
          waterTemp: result.waterTemp,
          airTemp: result.airTemp,
          windSpeed: result.windSpeed,
          windDirection: result.windDirection,
          time: result.time,
          fetchedAt: now,
        };
        updated = true;
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    }

    if (updated) {
      saveWeatherCache(newCache);

      // Update spots with new weather data
      setSpots(prev => prev.map(spot => {
        const cached = newCache[spot.id];
        if (cached) {
          return {
            ...spot,
            currentWaterTemp: cached.waterTemp,
            currentAirTemp: cached.airTemp,
            windSpeed: cached.windSpeed,
            windDirection: cached.windDirection,
            lastUpdated: cached.time as unknown as Date,
          };
        }
        return spot;
      }));
    }
  };

  // Add a new user spot
  const addSpot = useCallback((newSpot: Omit<FishingSpot, "id" | "currentWaterTemp" | "currentAirTemp" | "windSpeed" | "windDirection" | "lastUpdated">) => {
    const userSpots = loadUserSpots();
    const maxId = Math.max(...BUNDLED_SPOTS.map(s => s.id), ...userSpots.map(s => s.id), 0);

    const spot: FishingSpot = {
      ...newSpot,
      id: maxId + 1,
      currentWaterTemp: null,
      currentAirTemp: null,
      windSpeed: null,
      windDirection: null,
      lastUpdated: null,
    };

    const updatedUserSpots = [...userSpots, spot];
    saveUserSpots(updatedUserSpots);

    setSpots(prev => [...prev, spot].sort((a, b) => a.name.localeCompare(b.name)));

    // Fetch weather for new spot
    fetchWeather(spot.latitude, spot.longitude).then(result => {
      if (result) {
        const cache = loadWeatherCache();
        cache[spot.id] = {
          waterTemp: result.waterTemp,
          airTemp: result.airTemp,
          windSpeed: result.windSpeed,
          windDirection: result.windDirection,
          time: result.time,
          fetchedAt: Date.now(),
        };
        saveWeatherCache(cache);

        setSpots(prev => prev.map(s =>
          s.id === spot.id
            ? { ...s, currentWaterTemp: result.waterTemp, currentAirTemp: result.airTemp, windSpeed: result.windSpeed, windDirection: result.windDirection, lastUpdated: result.time as unknown as Date }
            : s
        ));
      }
    });

    return spot;
  }, []);

  // Delete a user spot
  const deleteSpot = useCallback((id: number) => {
    // Can only delete user spots
    if (BUNDLED_SPOTS.some(s => s.id === id)) {
      return false;
    }

    const userSpots = loadUserSpots();
    const filtered = userSpots.filter(s => s.id !== id);
    saveUserSpots(filtered);

    setSpots(prev => prev.filter(s => s.id !== id));
    return true;
  }, []);

  // Get single spot
  const getSpot = useCallback((id: number) => {
    return spots.find(s => s.id === id);
  }, [spots]);

  // Initial load
  useEffect(() => {
    loadSpots();
  }, [loadSpots]);

  return {
    spots,
    isLoading,
    error,
    addSpot,
    deleteSpot,
    getSpot,
    refetch: loadSpots,
  };
}

// Single spot hook
export function useStaticSpot(id: number) {
  const { spots, isLoading, error } = useStaticSpots();
  const spot = spots.find(s => s.id === id);

  return {
    data: spot,
    isLoading,
    error,
  };
}

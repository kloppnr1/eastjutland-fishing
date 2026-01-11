import { useState, useEffect, useCallback, useRef } from "react";
import type { FishingSpot } from "@shared/schema";
import { BUNDLED_SPOTS } from "@/data/spots";

const USER_SPOTS_KEY = "ostjylland-user-spots";
const WEATHER_TILE_CACHE_KEY = "ostjylland-weather-tiles-v3";
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const TILE_SIZE = 0.1; // ~11km tiles (0.1 degrees)
const REQUEST_DELAY = 300; // 300ms between API requests

// Format date for cache key (YYYY-MM-DD-HH)
function formatDateTimeKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}`;
}

// Format date for API (YYYY-MM-DD)
function formatDateForApi(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Check if date is within forecast range (Open-Meteo provides ~16 days forecast)
function isWithinForecastRange(date: Date): boolean {
  const now = new Date();
  const diffDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= -5 && diffDays <= 16; // 5 days past, 16 days future
}

interface WeatherData {
  waterTemp: number | null;
  airTemp: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  time: string;
  fetchedAt: number;
}

interface WeatherTileCache {
  [tileKey: string]: WeatherData;
}

// Get tile key for a coordinate (rounds to TILE_SIZE grid)
function getTileKey(lat: number, lng: number): string {
  const tileLat = Math.floor(lat / TILE_SIZE) * TILE_SIZE;
  const tileLng = Math.floor(lng / TILE_SIZE) * TILE_SIZE;
  return `${tileLat.toFixed(1)}_${tileLng.toFixed(1)}`;
}

// Get tile center coordinates for API request
function getTileCenter(lat: number, lng: number): { lat: number; lng: number } {
  const tileLat = Math.floor(lat / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
  const tileLng = Math.floor(lng / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
  return { lat: tileLat, lng: tileLng };
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

// Load weather tile cache from localStorage
function loadWeatherTileCache(): WeatherTileCache {
  try {
    const stored = localStorage.getItem(WEATHER_TILE_CACHE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error("Failed to load weather tile cache:", err);
  }
  return {};
}

// Save weather tile cache to localStorage
function saveWeatherTileCache(cache: WeatherTileCache) {
  try {
    localStorage.setItem(WEATHER_TILE_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.error("Failed to save weather tile cache:", err);
  }
}

// Get full cache key including datetime
function getFullCacheKey(lat: number, lng: number, dateTime: Date): string {
  const tileKey = getTileKey(lat, lng);
  const dateTimeKey = formatDateTimeKey(dateTime);
  return `${tileKey}_${dateTimeKey}`;
}

// Get cached weather for a location and time (checks tile cache)
function getCachedWeather(lat: number, lng: number, dateTime: Date, cache: WeatherTileCache): WeatherData | null {
  const fullKey = getFullCacheKey(lat, lng, dateTime);
  const cached = cache[fullKey];
  if (cached && (Date.now() - cached.fetchedAt) < CACHE_DURATION) {
    return cached;
  }
  return null;
}

// Fetch weather from Open-Meteo API for a tile at a specific time
async function fetchWeatherForTile(lat: number, lng: number, targetDateTime: Date): Promise<WeatherData | null> {
  try {
    // Use tile center for API request
    const center = getTileCenter(lat, lng);
    const isCurrentTime = isCurrentHour(targetDateTime);
    const dateStr = formatDateForApi(targetDateTime);
    const targetHour = targetDateTime.getHours();

    let marineRes: Response;
    let weatherRes: Response;

    if (isCurrentTime) {
      // Use current weather endpoints for real-time data
      [marineRes, weatherRes] = await Promise.all([
        fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${center.lat}&longitude=${center.lng}&current=sea_surface_temperature`),
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${center.lat}&longitude=${center.lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=Europe/Copenhagen`),
      ]);
    } else {
      // Use hourly endpoints for historical/forecast data
      [marineRes, weatherRes] = await Promise.all([
        fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${center.lat}&longitude=${center.lng}&hourly=sea_surface_temperature&start_date=${dateStr}&end_date=${dateStr}&timezone=Europe/Copenhagen`),
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${center.lat}&longitude=${center.lng}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&start_date=${dateStr}&end_date=${dateStr}&timezone=Europe/Copenhagen`),
      ]);
    }

    // Handle rate limiting
    if (marineRes.status === 429 || weatherRes.status === 429) {
      console.warn("Rate limited by Open-Meteo API, will retry later");
      return null;
    }

    let waterTemp: number | null = null;
    let airTemp: number | null = null;
    let windSpeed: number | null = null;
    let windDirection: number | null = null;
    let time: string | null = null;

    if (marineRes.ok) {
      const marineData = await marineRes.json();
      if (isCurrentTime) {
        waterTemp = marineData.current?.sea_surface_temperature ?? null;
        time = marineData.current?.time ?? null;
      } else {
        // Extract hourly data at target hour
        const hourlyTimes = marineData.hourly?.time as string[] | undefined;
        const hourlyTemps = marineData.hourly?.sea_surface_temperature as number[] | undefined;
        if (hourlyTimes && hourlyTemps) {
          const hourIndex = hourlyTimes.findIndex(t => new Date(t).getHours() === targetHour);
          if (hourIndex !== -1) {
            waterTemp = hourlyTemps[hourIndex] ?? null;
            time = hourlyTimes[hourIndex] ?? null;
          }
        }
      }
    }

    if (weatherRes.ok) {
      const weatherData = await weatherRes.json();
      if (isCurrentTime) {
        airTemp = weatherData.current?.temperature_2m ?? null;
        windSpeed = weatherData.current?.wind_speed_10m ?? null;
        windDirection = weatherData.current?.wind_direction_10m ?? null;
        if (!time) time = weatherData.current?.time ?? null;
      } else {
        // Extract hourly data at target hour
        const hourlyTimes = weatherData.hourly?.time as string[] | undefined;
        const hourlyAirTemps = weatherData.hourly?.temperature_2m as number[] | undefined;
        const hourlyWindSpeeds = weatherData.hourly?.wind_speed_10m as number[] | undefined;
        const hourlyWindDirs = weatherData.hourly?.wind_direction_10m as number[] | undefined;
        if (hourlyTimes) {
          const hourIndex = hourlyTimes.findIndex(t => new Date(t).getHours() === targetHour);
          if (hourIndex !== -1) {
            airTemp = hourlyAirTemps?.[hourIndex] ?? null;
            windSpeed = hourlyWindSpeeds?.[hourIndex] ?? null;
            windDirection = hourlyWindDirs?.[hourIndex] ?? null;
            if (!time) time = hourlyTimes[hourIndex] ?? null;
          }
        }
      }
    }

    if (time && (waterTemp !== null || airTemp !== null)) {
      return { waterTemp, airTemp, windSpeed, windDirection, time, fetchedAt: Date.now() };
    }
  } catch (err) {
    console.error("Failed to fetch weather:", err);
  }
  return null;
}

// Check if datetime is within current hour
function isCurrentHour(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate() &&
    date.getHours() === now.getHours();
}

export function useStaticSpots(selectedDateTime?: Date) {
  const [spots, setSpots] = useState<FishingSpot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const currentDateTimeRef = useRef<Date>(selectedDateTime || new Date());

  // Update ref when selectedDateTime changes
  useEffect(() => {
    currentDateTimeRef.current = selectedDateTime || new Date();
  }, [selectedDateTime]);

  // Load and merge spots
  const loadSpots = useCallback(async (targetDateTime: Date) => {
    setIsLoading(true);
    try {
      const userSpots = loadUserSpots();
      const tileCache = loadWeatherTileCache();

      // Merge bundled and user spots
      const allSpots = [...BUNDLED_SPOTS, ...userSpots];

      // Apply cached weather data from tiles
      const spotsWithWeather = allSpots.map(spot => {
        // Skip webcams - they don't need weather
        if (spot.spotType === "webcam") return spot;

        const cached = getCachedWeather(Number(spot.latitude), Number(spot.longitude), targetDateTime, tileCache);
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
      });

      setSpots(spotsWithWeather.sort((a, b) => a.name.localeCompare(b.name)));
      setError(null);

      // Fetch fresh weather in background for unique tiles only
      fetchWeatherForTiles(allSpots, tileCache, targetDateTime);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load spots"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch weather for unique tiles only (not per spot)
  const fetchWeatherForTiles = async (allSpots: FishingSpot[], existingCache: WeatherTileCache, targetDateTime: Date) => {
    const newCache: WeatherTileCache = { ...existingCache };
    const tilesToFetch = new Set<string>();

    // Find unique tiles that need fetching (skip webcams)
    for (const spot of allSpots) {
      if (spot.spotType === "webcam") continue;

      const lat = Number(spot.latitude);
      const lng = Number(spot.longitude);
      const fullKey = getFullCacheKey(lat, lng, targetDateTime);

      // Skip if tile is already cached and fresh
      const cached = existingCache[fullKey];
      if (cached && (Date.now() - cached.fetchedAt) < CACHE_DURATION) {
        continue;
      }

      // Store tile coords for fetching (use base tile key to group)
      tilesToFetch.add(`${lat}_${lng}`);
    }

    if (tilesToFetch.size === 0) return;

    console.log(`Fetching weather for ${tilesToFetch.size} tiles at ${formatDateTimeKey(targetDateTime)}`);
    let updated = false;

    for (const tileCoords of Array.from(tilesToFetch)) {
      const [latStr, lngStr] = tileCoords.split("_");
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      const result = await fetchWeatherForTile(lat, lng, targetDateTime);
      if (result) {
        const fullKey = getFullCacheKey(lat, lng, targetDateTime);
        newCache[fullKey] = result;
        updated = true;
      }

      // Delay between requests to avoid rate limiting
      await new Promise(r => setTimeout(r, REQUEST_DELAY));
    }

    if (updated) {
      saveWeatherTileCache(newCache);

      // Update spots with new weather data
      setSpots(prev => prev.map(spot => {
        if (spot.spotType === "webcam") return spot;

        const lat = Number(spot.latitude);
        const lng = Number(spot.longitude);
        const fullKey = getFullCacheKey(lat, lng, targetDateTime);
        const cached = newCache[fullKey];

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
    const tileCache = loadWeatherTileCache();
    const maxId = Math.max(...BUNDLED_SPOTS.map(s => s.id), ...userSpots.map(s => s.id), 0);
    const targetDateTime = currentDateTimeRef.current;

    const lat = Number(newSpot.latitude);
    const lng = Number(newSpot.longitude);

    // Check if we already have cached weather for this tile and time
    const cachedWeather = getCachedWeather(lat, lng, targetDateTime, tileCache);

    const spot: FishingSpot = {
      ...newSpot,
      id: maxId + 1,
      currentWaterTemp: cachedWeather?.waterTemp ?? null,
      currentAirTemp: cachedWeather?.airTemp ?? null,
      windSpeed: cachedWeather?.windSpeed ?? null,
      windDirection: cachedWeather?.windDirection ?? null,
      lastUpdated: cachedWeather?.time as unknown as Date ?? null,
    };

    const updatedUserSpots = [...userSpots, spot];
    saveUserSpots(updatedUserSpots);

    setSpots(prev => [...prev, spot].sort((a, b) => a.name.localeCompare(b.name)));

    // Fetch weather if not cached
    if (!cachedWeather) {
      fetchWeatherForTile(lat, lng, targetDateTime).then(result => {
        if (result) {
          const cache = loadWeatherTileCache();
          const fullKey = getFullCacheKey(lat, lng, targetDateTime);
          cache[fullKey] = result;
          saveWeatherTileCache(cache);

          setSpots(prev => prev.map(s =>
            s.id === spot.id
              ? { ...s, currentWaterTemp: result.waterTemp, currentAirTemp: result.airTemp, windSpeed: result.windSpeed, windDirection: result.windDirection, lastUpdated: result.time as unknown as Date }
              : s
          ));
        }
      });
    }

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

  // Load when selectedDateTime changes
  useEffect(() => {
    const targetDateTime = selectedDateTime || new Date();
    loadSpots(targetDateTime);
  }, [loadSpots, selectedDateTime]);

  // Wrap refetch to use current datetime
  const refetch = useCallback(() => {
    loadSpots(currentDateTimeRef.current);
  }, [loadSpots]);

  return {
    spots,
    isLoading,
    error,
    addSpot,
    deleteSpot,
    getSpot,
    refetch,
    selectedDateTime: currentDateTimeRef.current,
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

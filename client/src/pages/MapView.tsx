import { useSpots } from "@/hooks/use-spots";
import { Header } from "@/components/Header";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import { divIcon, DomEvent } from "leaflet";
import { Link } from "wouter";
import { Loader2, Navigation, Video } from "lucide-react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

// Auto-refreshing webcam image component
function AutoRefreshImage({ src, alt, className, interval = 5000 }: { src: string; alt: string; className?: string; interval?: number }) {
  const [key, setKey] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setKey(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);

  return (
    <img
      key={key}
      src={`${src}${src.includes('?') ? '&' : '?'}t=${key}`}
      alt={alt}
      className={className}
    />
  );
}
import { useSearch } from "wouter";
import { AddSpotModal } from "@/components/AddSpotModal";
import { resolveImageUrl } from "@/lib/image-url";
import "leaflet/dist/leaflet.css";

// Compact weather badge - used for known fishing spots
const createWeatherBadge = (
  waterTemp: number | null,
  windDir: number | null
) => {
  const waterColor = waterTemp === null ? "#6b7280" : waterTemp < 5 ? "#3b82f6" : waterTemp < 12 ? "#14b8a6" : "#f97316";
  const waterText = waterTemp != null ? waterTemp.toFixed(0) : "--";

  // SVG arrow for wind direction
  const arrowRotation = windDir != null ? windDir + 180 : 0;
  const windArrow = windDir != null
    ? `<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${arrowRotation}deg);">
        <path d="M12 2L12 22M12 2L6 8M12 2L18 8"/>
       </svg>`
    : '';

  return divIcon({
    className: "weather-badge-marker",
    html: `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="
          background: white;
          padding: 3px 6px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 700;
          box-shadow: 0 1px 4px rgba(0,0,0,0.2);
          border: 1.5px solid ${waterColor};
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 3px;
        ">
          <span style="color: ${waterColor};">${waterText}°</span>
          ${windArrow}
        </div>
        <div style="width: 1.5px; height: 6px; background: ${waterColor};"></div>
        <div style="
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: ${waterColor};
          box-shadow: 0 0 0 1.5px white;
        "></div>
      </div>
    `,
    iconSize: [50, 36],
    iconAnchor: [25, 36],
    popupAnchor: [0, -36],
  });
};

// Wrapper for known spots
const createSpotIcon = (
  waterTemp: number | null,
  windDir: number | null
) => {
  return createWeatherBadge(waterTemp, windDir);
};

// Webcam marker icon - just camera icon
const createWebcamIcon = () => {
  return divIcon({
    className: "webcam-marker",
    html: `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          padding: 10px;
          border-radius: 50%;
          box-shadow: 0 3px 10px rgba(124, 58, 237, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
          </svg>
        </div>
        <div style="width: 2px; height: 10px; background: #7c3aed;"></div>
        <div style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #7c3aed;
          box-shadow: 0 0 0 2px white;
        "></div>
      </div>
    `,
    iconSize: [40, 58],
    iconAnchor: [20, 58],
    popupAnchor: [0, -58],
  });
};

// Component to handle map click events
function MapClickHandler({
  onMapClick
}: {
  onMapClick: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click: (e) => {
      map.closePopup(); // Close any open spot popup
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to fly to a specific location
function FlyToLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([lat, lng], 14, { duration: 1.5 });
  }, [map, lat, lng]);

  return null;
}

// Helper to convert wind direction degrees to compass direction
const getWindDirectionText = (degrees: number) => {
  const directions = ["N", "NØ", "Ø", "SØ", "S", "SV", "V", "NV"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

// Generate SVG sparkline paths from temperature data (past and future)
function generateSparklinePaths(
  temps: (number | null)[],
  width: number,
  height: number,
  futureStartIndex: number
): { pastPath: string; futurePath: string; nowX: number } {
  const validTemps = temps.filter((t): t is number => t !== null);
  if (validTemps.length < 2) return { pastPath: "", futurePath: "", nowX: width / 2 };

  const min = Math.min(...validTemps);
  const max = Math.max(...validTemps);

  // Use a minimum range of 3 degrees to flatten the graph
  const dataRange = max - min;
  const minRange = 3;
  const range = Math.max(dataRange, minRange);

  // Center the data in the expanded range
  const padding = (range - dataRange) / 2;
  const adjustedMin = min - padding;

  // Now is always at center since we have equal hours on both sides
  const nowX = width / 2;

  // Split temps into past and future
  const pastTemps = futureStartIndex >= 0 ? temps.slice(0, futureStartIndex) : temps;
  const futureTemps = futureStartIndex >= 0 ? temps.slice(futureStartIndex) : [];

  // Build past points (0 to nowX)
  const pastPoints: { x: number; y: number }[] = [];
  pastTemps.forEach((temp, i) => {
    if (temp === null) return;
    const x = pastTemps.length > 1 ? (i / (pastTemps.length - 1)) * nowX : 0;
    const y = height - ((temp - adjustedMin) / range) * height;
    pastPoints.push({ x, y });
  });

  // Build future points (nowX to width)
  const futurePoints: { x: number; y: number }[] = [];
  futureTemps.forEach((temp, i) => {
    if (temp === null) return;
    const x = futureTemps.length > 1 ? nowX + (i / (futureTemps.length - 1)) * (width - nowX) : nowX;
    const y = height - ((temp - adjustedMin) / range) * height;
    futurePoints.push({ x, y });
  });

  // Connect past and future at nowX
  if (pastPoints.length > 0 && futurePoints.length > 0) {
    futurePoints.unshift({ ...pastPoints[pastPoints.length - 1], x: nowX });
  }

  const pastPath = pastPoints.length > 1
    ? `M${pastPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")}`
    : "";

  const futurePath = futurePoints.length > 1
    ? `M${futurePoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")}`
    : "";

  return { pastPath, futurePath, nowX };
}

// Weather badge component that appears on map click
function TempBadge({
  coordinates,
  onClose,
  onAddSpot
}: {
  coordinates: { lat: number; lng: number } | null;
  onClose: () => void;
  onAddSpot: () => void;
}) {
  const [waterTemp, setWaterTemp] = useState<number | null>(null);
  const [airTemp, setAirTemp] = useState<number | null>(null);
  const [windSpeed, setWindSpeed] = useState<number | null>(null);
  const [windDirection, setWindDirection] = useState<number | null>(null);
  const [historicalTemps, setHistoricalTemps] = useState<(number | null)[]>([]);
  const [historicalDates, setHistoricalDates] = useState<string[]>([]);
  const [futureStartIndex, setFutureStartIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(true);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const markerRef = useRef<L.Marker>(null);

  // Reverse geocoding to get place name
  const fetchPlaceName = useCallback(async () => {
    if (!coordinates) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.lat}&lon=${coordinates.lng}&zoom=14&addressdetails=1`,
        { headers: { 'Accept-Language': 'da' } }
      );
      if (res.ok) {
        const data = await res.json();
        const address = data.address || {};
        const name = address.beach || address.water || address.bay ||
                     address.peninsula || address.locality || address.hamlet ||
                     address.village || address.suburb || address.town ||
                     address.municipality || data.name;
        if (name) {
          setPlaceName(name);
        }
      }
    } catch (err) {
      console.error("Failed to fetch place name:", err);
    }
  }, [coordinates?.lat, coordinates?.lng]);

  const fetchWeather = useCallback(async () => {
    if (!coordinates) return;

    setLoading(true);
    try {
      const [marineRes, weatherRes, historyRes] = await Promise.all([
        fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${coordinates.lat}&longitude=${coordinates.lng}&current=sea_surface_temperature&timezone=Europe/Copenhagen`),
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coordinates.lat}&longitude=${coordinates.lng}&current=temperature_2m,wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=Europe/Copenhagen`),
        fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${coordinates.lat}&longitude=${coordinates.lng}&hourly=sea_surface_temperature&past_days=3&forecast_days=3&timezone=Europe/Copenhagen`),
      ]);

      if (marineRes.ok) {
        const marineData = await marineRes.json();
        const temp = marineData.current?.sea_surface_temperature;
        if (typeof temp === "number") {
          setWaterTemp(temp);
        }
      }

      if (weatherRes.ok) {
        const weatherData = await weatherRes.json();
        const temp = weatherData.current?.temperature_2m;
        const wind = weatherData.current?.wind_speed_10m;
        const dir = weatherData.current?.wind_direction_10m;
        if (typeof temp === "number") setAirTemp(temp);
        if (typeof wind === "number") setWindSpeed(wind);
        if (typeof dir === "number") setWindDirection(dir);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const times: string[] = historyData.hourly?.time || [];
        const temps: (number | null)[] = historyData.hourly?.sea_surface_temperature || [];

        // Get current hour in Danish time
        const nowDanish = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Copenhagen' });
        const nowParts = nowDanish.split(/[- :]/);
        const nowDate = new Date(
          parseInt(nowParts[0]),
          parseInt(nowParts[1]) - 1,
          parseInt(nowParts[2]),
          parseInt(nowParts[3])
        );

        // Filter to 72 hours past + 48 hours future from now
        const filtered: { temp: number | null; isFuture: boolean; date: string }[] = [];
        for (let i = 0; i < times.length; i++) {
          const match = times[i].match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})/);
          if (!match) continue;

          const dataDate = new Date(
            parseInt(match[1]),
            parseInt(match[2]) - 1,
            parseInt(match[3]),
            parseInt(match[4])
          );
          const hoursDiff = (dataDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);

          // Include 72 hours past to 72 hours future
          if (hoursDiff >= -72 && hoursDiff <= 72) {
            filtered.push({
              temp: temps[i],
              isFuture: hoursDiff > 0,
              date: `${parseInt(match[3])}/${parseInt(match[2])}`
            });
          }
        }
        setHistoricalTemps(filtered.map(f => f.temp));
        setHistoricalDates(filtered.map(f => f.date));
        setFutureStartIndex(filtered.findIndex(f => f.isFuture));
      }
    } catch (err) {
      console.error("Failed to fetch weather:", err);
    } finally {
      setLoading(false);
    }
  }, [coordinates?.lat, coordinates?.lng]);

  useEffect(() => {
    if (coordinates) {
      setWaterTemp(null);
      setAirTemp(null);
      setWindSpeed(null);
      setWindDirection(null);
      setHistoricalTemps([]);
      setHistoricalDates([]);
      setFutureStartIndex(-1);
      setPlaceName(null);
      fetchWeather();
      fetchPlaceName();
    }
  }, [coordinates?.lat, coordinates?.lng, fetchWeather, fetchPlaceName]);

  if (!coordinates) return null;

  // Wind direction arrow rotation
  const arrowRotation = windDirection != null ? windDirection + 180 : 0;

  // Weather badge with line and dot
  const waterText = loading ? "..." : (waterTemp != null ? waterTemp.toFixed(1) + "°" : "--");
  const airText = loading ? "..." : (airTemp != null ? airTemp.toFixed(1) + "°" : "--");
  const windText = loading ? "..." : (windSpeed != null ? windSpeed.toFixed(0) : "--");

  // Generate sparkline paths (past solid, future dashed)
  const { pastPath, futurePath, nowX } = generateSparklinePaths(historicalTemps, 200, 50, futureStartIndex);

  // Get start, now, and end dates/temps for labels
  const startDate = historicalDates.length > 0 ? historicalDates[0] : '';
  const endDate = historicalDates.length > 0 ? historicalDates[historicalDates.length - 1] : '';
  const validTemps = historicalTemps.filter((t): t is number => t !== null);
  const startTemp = validTemps.length > 0 ? validTemps[0] : null;
  const endTemp = validTemps.length > 0 ? validTemps[validTemps.length - 1] : null;
  const nowTemp = futureStartIndex > 0 && historicalTemps[futureStartIndex - 1] != null
    ? historicalTemps[futureStartIndex - 1]
    : null;

  const clickedLocationIcon = divIcon({
    className: "clicked-location-marker",
    html: `
      <div style="display: flex; flex-direction: column; align-items: center;">
        <div style="
          background: white;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
          display: flex;
          flex-direction: column;
          gap: 8px;
        ">
          <!-- Place name -->
          <div style="font-size: 14px; font-weight: 700; color: #1e3a5f; text-align: center; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-height: 20px;">
            ${placeName || ''}
          </div>
          <!-- Values row -->
          <div style="display: flex; align-items: center; gap: 16px; justify-content: center;">
            <span style="color: #2563eb; display: flex; align-items: center; gap: 6px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>
              ${waterText}
            </span>
            <span style="color: #f97316; display: flex; align-items: center; gap: 6px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>
              ${airText}
            </span>
            <span style="color: #4b5563; display: flex; align-items: center; gap: 6px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="transform: rotate(${arrowRotation}deg);"><path d="M12 2L12 22M12 2L6 8M12 2L18 8"/></svg>
              ${windText}
            </span>
          </div>
          <!-- Sparkline -->
          <svg width="200" height="50" style="overflow: visible;">
            <defs>
              <linearGradient id="sparkGradPast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.2"/>
                <stop offset="100%" stop-color="#3b82f6" stop-opacity="0"/>
              </linearGradient>
              <linearGradient id="sparkGradFuture" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#f97316" stop-opacity="0.15"/>
                <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
              </linearGradient>
            </defs>
            ${pastPath ? `
              <path d="${pastPath} L${nowX},50 L0,50 Z" fill="url(#sparkGradPast)" />
              <path d="${pastPath}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            ` : ''}
            ${futurePath ? `
              <path d="${futurePath} L200,50 L${nowX},50 Z" fill="url(#sparkGradFuture)" />
              <path d="${futurePath}" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4,3"/>
            ` : ''}
            ${nowX > 0 ? `<line x1="${nowX}" y1="0" x2="${nowX}" y2="50" stroke="#ef4444" stroke-width="1.5"/>` : ''}
          </svg>
          <!-- Date labels underneath -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; font-size: 11px; width: 200px;">
            <div style="display: flex; flex-direction: column; align-items: flex-start; background: #f0f9ff; padding: 4px 8px; border-radius: 6px;">
              <span style="font-weight: 600; color: #1e40af;">${startDate}</span>
              <span style="font-size: 12px; font-weight: 700; color: #3b82f6;">${startTemp !== null ? startTemp.toFixed(1) + '°' : ''}</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; background: #fef2f2; padding: 4px 8px; border-radius: 6px;">
              <span style="color: #991b1b; font-weight: 600; font-size: 10px;">Nu</span>
              <span style="font-size: 12px; font-weight: 700; color: #ef4444;">${nowTemp !== null ? nowTemp.toFixed(1) + '°' : ''}</span>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; background: #fff7ed; padding: 4px 8px; border-radius: 6px;">
              <span style="font-weight: 600; color: #c2410c;">${endDate}</span>
              <span style="font-size: 12px; font-weight: 700; color: #f97316;">${endTemp !== null ? endTemp.toFixed(1) + '°' : ''}</span>
            </div>
          </div>
          <!-- Add spot button -->
          <div style="display: flex; justify-content: flex-start; margin-top: 4px;">
            <div class="add-spot-btn" style="
              display: flex;
              align-items: center;
              gap: 4px;
              color: #3b82f6;
              padding: 4px 0;
              font-size: 11px;
              font-weight: 500;
              cursor: pointer;
            ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              Gem sted
            </div>
          </div>
        </div>
        <div style="width: 2px; height: 20px; background: #3b82f6;"></div>
        <div style="
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #3b82f6;
          box-shadow: 0 0 0 3px white;
        "></div>
      </div>
    `,
    iconSize: [280, 235],
    iconAnchor: [140, 235],
  });

  // Invisible button marker positioned over the "Add spot" button (left-aligned)
  const addButtonIcon = divIcon({
    className: "add-spot-button-marker",
    html: `<div style="width: 90px; height: 30px; cursor: pointer;"></div>`,
    iconSize: [90, 30],
    iconAnchor: [110, 52], // Position over the left-aligned button
  });

  return (
    <>
      <Marker
        ref={markerRef}
        position={[coordinates.lat, coordinates.lng]}
        icon={clickedLocationIcon}
        zIndexOffset={1000}
        eventHandlers={{
          click: (e) => {
            DomEvent.stopPropagation(e.originalEvent);
            onClose();
          },
        }}
      />
      {/* Invisible marker over the add button to capture clicks */}
      <Marker
        position={[coordinates.lat, coordinates.lng]}
        icon={addButtonIcon}
        zIndexOffset={1001}
        eventHandlers={{
          click: (e) => {
            DomEvent.stopPropagation(e.originalEvent);
            onAddSpot();
          },
        }}
      />
    </>
  );
}

// Sparkline component for spot popups
function SpotSparkline({ lat, lng }: { lat: string; lng: string }) {
  const [temps, setTemps] = useState<(number | null)[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [futureStartIndex, setFutureStartIndex] = useState<number>(-1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(
          `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=sea_surface_temperature&past_days=3&forecast_days=3&timezone=Europe/Copenhagen`
        );
        if (res.ok) {
          const data = await res.json();
          const times: string[] = data.hourly?.time || [];
          const tempData: (number | null)[] = data.hourly?.sea_surface_temperature || [];

          const nowDanish = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Copenhagen' });
          const nowParts = nowDanish.split(/[- :]/);
          const nowDate = new Date(
            parseInt(nowParts[0]),
            parseInt(nowParts[1]) - 1,
            parseInt(nowParts[2]),
            parseInt(nowParts[3])
          );

          const filtered: { temp: number | null; isFuture: boolean; date: string }[] = [];
          for (let i = 0; i < times.length; i++) {
            const match = times[i].match(/(\d{4})-(\d{2})-(\d{2})T(\d{2})/);
            if (!match) continue;

            const dataDate = new Date(
              parseInt(match[1]),
              parseInt(match[2]) - 1,
              parseInt(match[3]),
              parseInt(match[4])
            );
            const hoursDiff = (dataDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);

            if (hoursDiff >= -72 && hoursDiff <= 72) {
              filtered.push({
                temp: tempData[i],
                isFuture: hoursDiff > 0,
                date: `${parseInt(match[3])}/${parseInt(match[2])}`
              });
            }
          }
          setTemps(filtered.map(f => f.temp));
          setDates(filtered.map(f => f.date));
          setFutureStartIndex(filtered.findIndex(f => f.isFuture));
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [lat, lng]);

  if (loading) {
    return <div className="h-14 flex items-center justify-center text-xs text-gray-400">Indlæser graf...</div>;
  }

  const { pastPath, futurePath, nowX } = generateSparklinePaths(temps, 268, 40, futureStartIndex);
  const startDate = dates.length > 0 ? dates[0] : '';
  const endDate = dates.length > 0 ? dates[dates.length - 1] : '';
  const validTemps = temps.filter((t): t is number => t !== null);
  const startTemp = validTemps.length > 0 ? validTemps[0] : null;
  const endTemp = validTemps.length > 0 ? validTemps[validTemps.length - 1] : null;
  const nowTemp = futureStartIndex > 0 && temps[futureStartIndex - 1] != null
    ? temps[futureStartIndex - 1]
    : null;

  return (
    <div className="mt-2">
      <svg width="268" height="40" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="spotSparkGradPast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="spotSparkGradFuture" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f97316" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        {pastPath && (
          <>
            <path d={`${pastPath} L${nowX},40 L0,40 Z`} fill="url(#spotSparkGradPast)" />
            <path d={pastPath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
        {futurePath && (
          <>
            <path d={`${futurePath} L268,40 L${nowX},40 Z`} fill="url(#spotSparkGradFuture)" />
            <path d={futurePath} fill="none" stroke="#f97316" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,3" />
          </>
        )}
        {nowX > 0 && <line x1={nowX} y1={0} x2={nowX} y2={40} stroke="#ef4444" strokeWidth={1.5} />}
      </svg>
      {/* Date labels underneath */}
      <div className="flex justify-between items-start mt-1" style={{ width: 268 }}>
        <div className="flex flex-col items-start bg-blue-50 px-2 py-1 rounded">
          <span className="text-[10px] font-semibold text-blue-800">{startDate}</span>
          <span className="text-xs font-bold text-blue-600">{startTemp !== null ? `${startTemp.toFixed(1)}°` : ''}</span>
        </div>
        <div className="flex flex-col items-center bg-red-50 px-2 py-1 rounded">
          <span className="text-[10px] font-semibold text-red-800">Nu</span>
          <span className="text-xs font-bold text-red-500">{nowTemp !== null ? `${nowTemp.toFixed(1)}°` : ''}</span>
        </div>
        <div className="flex flex-col items-end bg-orange-50 px-2 py-1 rounded">
          <span className="text-[10px] font-semibold text-orange-800">{endDate}</span>
          <span className="text-xs font-bold text-orange-500">{endTemp !== null ? `${endTemp.toFixed(1)}°` : ''}</span>
        </div>
      </div>
    </div>
  );
}

export default function MapView() {
  const { data: spots, isLoading, error } = useSpots();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tempBadgeCoords, setTempBadgeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const searchString = useSearch();

  // Parse URL params for target location
  const targetLocation = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const lat = parseFloat(params.get("lat") || "");
    const lng = parseFloat(params.get("lng") || "");
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
    return null;
  }, [searchString]);

  // Center on Østjylland area (or target location if provided)
  const center: [number, number] = targetLocation
    ? [targetLocation.lat, targetLocation.lng]
    : [56.25, 10.5];
  const initialZoom = targetLocation ? 14 : 10;

  const handleMapClick = (lat: number, lng: number) => {
    setTempBadgeCoords({ lat, lng });
  };

  const handleAddSpot = () => {
    setIsAddModalOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />

      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Indlæser kort...</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50">
            <div className="text-center">
              <p className="text-destructive font-bold mb-2">Kunne ikke indlæse steder</p>
              <Link href="/" className="text-primary hover:underline">Tilbage til forsiden</Link>
            </div>
          </div>
        ) : (
          <MapContainer
            center={center}
            zoom={initialZoom}
            zoomControl={false}
            style={{ height: "100%", width: "100%" }}
            className="z-0 absolute inset-0"
          >
            <TileLayer
              attribution='&copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
            {/* Labels overlay */}
            <TileLayer
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              pane="overlayPane"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            {targetLocation && (
              <FlyToLocation lat={targetLocation.lat} lng={targetLocation.lng} />
            )}

            {/* Existing spots */}
            {spots?.map((spot) => {
              const isWebcam = spot.spotType === "webcam";

              return (
                <Marker
                  key={`${spot.id}-${spot.currentWaterTemp}-${spot.currentAirTemp}-${spot.windSpeed}`}
                  position={[Number(spot.latitude), Number(spot.longitude)]}
                  icon={isWebcam
                    ? createWebcamIcon()
                    : createSpotIcon(spot.currentWaterTemp, spot.windDirection)
                  }
                  eventHandlers={{
                    click: () => setTempBadgeCoords(null),
                  }}
                >
                  <Popup maxWidth={320} minWidth={280} closeButton={false}>
                    {isWebcam ? (
                      /* Webcam popup - simplified view */
                      <div>
                        <Link href={`/spot/${spot.id}`}>
                          <h3 className="font-bold text-sm mb-2 text-center text-purple-700 hover:text-purple-500 transition-colors cursor-pointer flex items-center justify-center gap-2">
                            <Video className="w-4 h-4" />
                            {spot.name}
                          </h3>
                        </Link>
                        {spot.webcamUrl && (
                          <div className="rounded-lg overflow-hidden aspect-video">
                            {/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(spot.webcamUrl) ? (
                              <AutoRefreshImage
                                src={spot.webcamUrl}
                                alt={`Webcam: ${spot.name}`}
                                className="w-full h-full object-cover"
                                interval={5000}
                              />
                            ) : (
                              <iframe
                                src={spot.webcamUrl}
                                className="w-full h-full"
                                frameBorder="0"
                                allowFullScreen
                                title={`Webcam: ${spot.name}`}
                              />
                            )}
                          </div>
                        )}
                        {spot.description && (
                          <p className="text-xs text-gray-500 mt-2 text-center">{spot.description}</p>
                        )}
                      </div>
                    ) : (
                      /* Fishing spot popup - full view */
                      <div>
                        {/* Spot Name */}
                        <Link href={`/spot/${spot.id}`}>
                          <h3 className="font-bold text-sm mb-2 text-center text-gray-800 hover:text-blue-600 transition-colors cursor-pointer">
                            {spot.name}
                          </h3>
                        </Link>

                        {/* Spot Image */}
                        {spot.imageUrl && (
                          <div className="h-32 mb-2 rounded-lg overflow-hidden">
                            <img
                              src={resolveImageUrl(spot.imageUrl) || undefined}
                              alt={spot.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Weather Data */}
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div className="bg-blue-50 rounded-md py-1.5 px-1">
                            <div className="text-lg font-bold text-blue-600">
                              {spot.currentWaterTemp != null ? `${spot.currentWaterTemp.toFixed(1)}°` : "--"}
                            </div>
                            <div className="text-[9px] text-gray-500">Vand</div>
                          </div>
                          <div className="bg-orange-50 rounded-md py-1.5 px-1">
                            <div className="text-lg font-bold text-orange-600">
                              {spot.currentAirTemp != null ? `${spot.currentAirTemp.toFixed(1)}°` : "--"}
                            </div>
                            <div className="text-[9px] text-gray-500">Luft</div>
                          </div>
                          <div className="bg-gray-50 rounded-md py-1.5 px-1">
                            <div className="text-lg font-bold text-gray-700 flex items-center justify-center gap-0.5">
                              {spot.windSpeed != null ? spot.windSpeed.toFixed(0) : "--"}
                              {spot.windDirection != null && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: `rotate(${spot.windDirection + 180}deg)` }} className="text-gray-400">
                                  <path d="M12 2L12 22M12 2L6 8M12 2L18 8"/>
                                </svg>
                              )}
                            </div>
                            <div className="text-[9px] text-gray-500">m/s</div>
                          </div>
                        </div>

                        {/* Sparkline Graph */}
                        <SpotSparkline lat={spot.latitude} lng={spot.longitude} />
                      </div>
                    )}
                  </Popup>
                </Marker>
              );
            })}

            {/* Temperature badge for clicked location */}
            {tempBadgeCoords && (
              <TempBadge
                coordinates={tempBadgeCoords}
                onClose={() => setTempBadgeCoords(null)}
                onAddSpot={handleAddSpot}
              />
            )}
          </MapContainer>
        )}

        {/* Spot count */}
        <div className="absolute top-6 right-6 z-[1000]">
          <div className="bg-white rounded-xl shadow-lg px-4 py-2">
            <span className="font-bold text-primary">{spots?.length || 0}</span>
            <span className="text-muted-foreground ml-1">fiskesteder</span>
          </div>
        </div>

      </div>

      <AddSpotModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        coordinates={tempBadgeCoords}
      />
    </div>
  );
}

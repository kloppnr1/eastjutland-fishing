import { useSpots } from "@/hooks/use-spots";
import { Header } from "@/components/Header";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { divIcon, DomEvent } from "leaflet";
import { Link } from "wouter";
import { Loader2, Navigation, Video, LocateFixed, Calendar, Clock, RotateCcw } from "lucide-react";
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

// Create cluster icon showing count and stats - stacked badge style
const createClusterIconFactory = (spots: any[] | undefined, scale: number = 1) => (cluster: any) => {
  const markers = cluster.getAllChildMarkers();
  const count = markers.length;

  // Match markers to spots by position
  const clusterSpots: any[] = [];
  if (spots) {
    for (const marker of markers) {
      const pos = marker.getLatLng();
      const spot = spots.find(s =>
        Math.abs(Number(s.latitude) - pos.lat) < 0.0001 &&
        Math.abs(Number(s.longitude) - pos.lng) < 0.0001
      );
      if (spot) clusterSpots.push(spot);
    }
  }

  // Calculate stats
  const waterTemps = clusterSpots.map(s => s.currentWaterTemp).filter((t): t is number => t != null);
  const windSpeeds = clusterSpots.map(s => s.windSpeed).filter((w): w is number => w != null);
  const windDirs = clusterSpots.map(s => s.windDirection).filter((d): d is number => d != null);

  const waterMin = waterTemps.length > 0 ? Math.min(...waterTemps) : null;
  const waterMax = waterTemps.length > 0 ? Math.max(...waterTemps) : null;
  const windMin = windSpeeds.length > 0 ? Math.min(...windSpeeds) : null;
  const windMax = windSpeeds.length > 0 ? Math.max(...windSpeeds) : null;

  // Format display values - show "--" for missing data
  // Compare rounded values to avoid showing duplicate ranges like "5.2-5.2°"
  const hasWaterData = waterMin != null && waterMax != null;
  const hasWindData = windMin != null && windMax != null;
  const waterMinRounded = hasWaterData ? waterMin.toFixed(1) : null;
  const waterMaxRounded = hasWaterData ? waterMax.toFixed(1) : null;
  const windMinRounded = hasWindData ? windMin.toFixed(0) : null;
  const windMaxRounded = hasWindData ? windMax.toFixed(0) : null;
  const waterText = hasWaterData
    ? (waterMinRounded === waterMaxRounded ? `${waterMinRounded}°` : `${waterMinRounded}-${waterMaxRounded}°`)
    : "--";
  const windText = hasWindData
    ? (windMinRounded === windMaxRounded ? `${windMinRounded}` : `${windMinRounded}-${windMaxRounded}`)
    : "--";
  const avgWindDir = windDirs.length > 0 ? Math.round(windDirs.reduce((a, b) => a + b, 0) / windDirs.length) : 0;

  const waterColor = hasWaterData ? (waterMin < 5 ? "#3b82f6" : waterMin < 12 ? "#14b8a6" : "#f97316") : "#6b7280";

  // Number of stacked cards to show (max 3)
  const stackCount = Math.min(3, count);

  // Badge dimensions matching fish spot badge (scaled by zoom level)
  // Fish spot uses: padding 6px 10px, icons 16/18px, font 14px, gap 5px
  const fontSize = Math.round(14 * scale);
  const waveIconSize = Math.round(16 * scale);
  const windIconSize = Math.round(18 * scale);
  const iconGap = Math.round(5 * scale);
  const rowGap = Math.round(3 * scale);
  const paddingV = Math.round(6 * scale);
  const paddingH = Math.round(10 * scale);
  const countPillPadding = Math.round(2 * scale);
  const dotSize = Math.round(10 * scale);
  const stemHeight = Math.round(12 * scale);
  const containerSize = Math.round(100 * scale);

  // Scaled positioning values
  const badgeBottom = Math.round(27 * scale);
  const backOffset = Math.round(12 * scale);
  const middleOffset = Math.round(10 * scale);
  // Fixed width for all badges to ensure consistent stacking
  // Width accommodates: water "10.5-12.3°" and wind "10-15" without wrapping
  const badgeWidth = Math.round(95 * scale);

  // Calculate badge height from actual content to ensure stacked badges match
  // Height = paddingV*2 + countPill + rowGap + waterRow + rowGap + windRow
  const countPillHeight = countPillPadding * 2 + fontSize;
  const waterRowHeight = Math.max(waveIconSize, fontSize);
  const windRowHeight = Math.max(windIconSize, fontSize);
  const badgeHeight = paddingV * 2 + countPillHeight + rowGap + waterRowHeight + rowGap + windRowHeight;

  return divIcon({
    html: `
      <div style="position: relative; width: ${containerSize}px; height: ${containerSize}px; pointer-events: none;">
        <!-- Anchor dot at center-bottom (matching fish spot) -->
        <div style="
          position: absolute;
          bottom: ${Math.round(5 * scale)}px;
          left: 50%;
          transform: translateX(-50%);
          width: ${dotSize}px;
          height: ${dotSize}px;
          border-radius: 50%;
          background: #3b82f6;
          box-shadow: 0 0 0 ${Math.round(2 * scale)}px white, 0 2px 4px rgba(0,0,0,0.3);
          z-index: 10;
        "></div>
        <!-- Stem pointing upward (matching fish spot) -->
        <div style="
          position: absolute;
          bottom: ${Math.round(15 * scale)}px;
          left: 50%;
          transform: translateX(-50%);
          width: ${Math.round(2 * scale)}px;
          height: ${stemHeight}px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        "></div>
        <!-- Stacked badges (back) -->
        ${stackCount >= 3 ? `
        <div style="
          position: absolute;
          bottom: ${badgeBottom + Math.round(8 * scale)}px;
          left: 50%;
          transform: translateX(calc(-50% - ${backOffset}px)) rotate(-15deg);
          background: #9ca3af;
          border-radius: ${Math.round(6 * scale)}px;
          width: ${badgeWidth}px;
          height: ${badgeHeight}px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        "></div>
        ` : ''}
        <!-- Stacked badges (middle) -->
        ${stackCount >= 2 ? `
        <div style="
          position: absolute;
          bottom: ${badgeBottom + Math.round(4 * scale)}px;
          left: 50%;
          transform: translateX(calc(-50% + ${middleOffset}px)) rotate(12deg);
          background: #d1d5db;
          border-radius: ${Math.round(6 * scale)}px;
          width: ${badgeWidth}px;
          height: ${badgeHeight}px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.15);
        "></div>
        ` : ''}
        <!-- Front badge with content (fixed width) -->
        <div style="
          position: absolute;
          bottom: ${badgeBottom}px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: ${Math.round(6 * scale)}px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          padding: ${paddingV}px ${paddingH}px;
          width: ${badgeWidth}px;
          box-sizing: border-box;
          white-space: nowrap;
          pointer-events: auto;
          cursor: pointer;
        ">
          <!-- Count in pill (fixed width, centered) -->
          <div style="background: #3b82f6; border-radius: ${Math.round(4 * scale)}px; padding: ${countPillPadding}px 0; margin: 0 auto ${rowGap}px auto; text-align: center; width: ${Math.round(28 * scale)}px;">
            <span style="font-size: ${fontSize}px; font-weight: 700; color: white;">${count}</span>
          </div>
          <!-- Row 1: Wave + Water Temp (matching fish spot) -->
          <div style="display: flex; align-items: center; gap: ${iconGap}px; margin-bottom: ${rowGap}px;">
            <svg width="${waveIconSize}" height="${waveIconSize}" viewBox="0 0 24 24" fill="none" stroke="${waterColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
              <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
            </svg>
            <span style="font-size: ${fontSize}px; font-weight: 700; color: ${waterColor};">${waterText}</span>
          </div>
          <!-- Row 2: Wind Arrow + Wind Speed (matching fish spot) -->
          <div style="display: flex; align-items: center; gap: ${iconGap}px;">
            <svg width="${windIconSize}" height="${windIconSize}" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="#64748b" stroke-width="1.5"/>
              ${hasWindData ? `<path d="M12 6L12 18M12 6L8 10M12 6L16 10" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform-origin: center; transform: rotate(${avgWindDir + 180}deg);"/>` : ''}
            </svg>
            <span style="font-size: ${fontSize}px; font-weight: 700; color: #64748b;">${windText}</span>
          </div>
        </div>
      </div>
    `,
    className: "cluster-icon",
    iconSize: [containerSize, containerSize],
    iconAnchor: [containerSize / 2, containerSize],
  });
};

// Square info badge - shows water temp and wind info
// scale: 0-1 for zoom-based scaling
const createWeatherBadge = (
  waterTemp: number | null,
  windSpeed: number | null,
  windDir: number | null,
  scale: number = 1
) => {
  const waterColor = waterTemp === null ? "#6b7280" : waterTemp < 5 ? "#3b82f6" : waterTemp < 12 ? "#14b8a6" : "#f97316";
  const waterText = waterTemp != null ? waterTemp.toFixed(1) : "--";
  const windText = windSpeed != null ? windSpeed.toFixed(0) : "--";
  // Wind arrow rotation (points where wind is coming FROM)
  const arrowRotation = windDir != null ? windDir + 180 : 0;

  return divIcon({
    className: "weather-badge-marker",
    html: `
      <div style="position: relative; width: 20px; height: 20px; transform: scale(${scale}); transform-origin: center bottom; pointer-events: none; overflow: visible;">
        <!-- Anchor dot at center-bottom -->
        <div style="
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #3b82f6;
          box-shadow: 0 0 0 2px white, 0 2px 4px rgba(0,0,0,0.3);
          z-index: 10;
          pointer-events: auto;
          cursor: pointer;
        "></div>
        <!-- Stem pointing upward -->
        <div style="
          position: absolute;
          bottom: 15px;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 12px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          pointer-events: none;
        "></div>
        <!-- Badge container -->
        <div style="
          position: absolute;
          bottom: 27px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: 6px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          padding: 6px 10px;
          white-space: nowrap;
          pointer-events: auto;
          cursor: pointer;
        ">
          <!-- Row 1: Wave + Water Temp -->
          <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 3px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${waterColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
              <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
            </svg>
            <span style="font-size: 14px; font-weight: 700; color: ${waterColor};">${waterText}°</span>
          </div>
          <!-- Row 2: Wind Arrow + Wind Speed -->
          <div style="display: flex; align-items: center; gap: 5px;">
            <svg width="18" height="18" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="#64748b" stroke-width="1.5"/>
              <path d="M12 6L12 18M12 6L8 10M12 6L16 10" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform-origin: center; transform: rotate(${arrowRotation}deg);"/>
            </svg>
            <span style="font-size: 14px; font-weight: 700; color: #64748b;">${windText}</span>
          </div>
        </div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 15],
    popupAnchor: [0, 8],
  });
};

// Wrapper for known spots
const createSpotIcon = (
  waterTemp: number | null,
  windSpeed: number | null,
  windDir: number | null,
  scale: number = 1
) => {
  return createWeatherBadge(waterTemp, windSpeed, windDir, scale);
};

// Expanded badge when spot is selected - shows full info
const createExpandedBadge = (
  spot: {
    name: string;
    imageUrl?: string | null;
    currentWaterTemp: number | null;
    currentAirTemp: number | null;
    windSpeed: number | null;
    windDirection: number | null;
  },
  resolveImageUrlFn: (url: string) => string | null
) => {
  const waterTemp = spot.currentWaterTemp;
  const airTemp = spot.currentAirTemp;
  const windSpeed = spot.windSpeed;
  const windDir = spot.windDirection;

  const waterColor = waterTemp === null ? "#6b7280" : waterTemp < 5 ? "#3b82f6" : waterTemp < 12 ? "#14b8a6" : "#f97316";
  const imageUrl = spot.imageUrl ? resolveImageUrlFn(spot.imageUrl) : null;

  return divIcon({
    className: "expanded-badge-marker",
    html: `
      <div style="
        position: relative;
        width: 20px;
        height: 20px;
        pointer-events: none;
        overflow: visible;
      ">
        <!-- Anchor dot -->
        <div style="
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #3b82f6;
          box-shadow: 0 0 0 3px white, 0 2px 8px rgba(0,0,0,0.4);
          z-index: 10;
        "></div>
        <!-- Stem -->
        <div style="
          position: absolute;
          bottom: 15px;
          left: 50%;
          transform: translateX(-50%);
          width: 3px;
          height: 20px;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        "></div>
        <!-- Expanded card -->
        <div style="
          position: absolute;
          bottom: 35px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
          padding: 12px;
          min-width: 200px;
          max-width: 280px;
          pointer-events: auto;
          cursor: pointer;
        " class="expanded-badge-content" data-spot-link="true">
          <!-- Name -->
          <div style="
            font-size: 14px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 8px;
            text-align: center;
          ">${spot.name}</div>

          ${imageUrl ? `
          <!-- Image -->
          <div style="
            width: 100%;
            height: 80px;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 10px;
          ">
            <img src="${imageUrl}" alt="${spot.name}" style="width: 100%; height: 100%; object-fit: cover;" />
          </div>
          ` : ''}

          <!-- Stats row -->
          <div style="
            display: flex;
            gap: 8px;
            justify-content: center;
          ">
            <!-- Water temp -->
            <div style="
              background: #eff6ff;
              border-radius: 8px;
              padding: 8px 12px;
              text-align: center;
              flex: 1;
            ">
              <div style="font-size: 18px; font-weight: 700; color: ${waterColor};">
                ${waterTemp != null ? waterTemp.toFixed(1) + '°' : '--'}
              </div>
              <div style="font-size: 10px; color: #6b7280;">Vand</div>
            </div>

            <!-- Air temp -->
            <div style="
              background: #fff7ed;
              border-radius: 8px;
              padding: 8px 12px;
              text-align: center;
              flex: 1;
            ">
              <div style="font-size: 18px; font-weight: 700; color: #ea580c;">
                ${airTemp != null ? airTemp.toFixed(1) + '°' : '--'}
              </div>
              <div style="font-size: 10px; color: #6b7280;">Luft</div>
            </div>

            <!-- Wind -->
            <div style="
              background: #f3f4f6;
              border-radius: 8px;
              padding: 8px 12px;
              text-align: center;
              flex: 1;
            ">
              <div style="font-size: 18px; font-weight: 700; color: #374151; display: flex; align-items: center; justify-content: center; gap: 2px;">
                ${windSpeed != null ? windSpeed.toFixed(0) : '--'}
                ${windDir != null ? `
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${windDir + 180}deg); color: #9ca3af;">
                    <path d="M12 2L12 22M12 2L6 8M12 2L18 8"/>
                  </svg>
                ` : ''}
              </div>
              <div style="font-size: 10px; color: #6b7280;">m/s</div>
            </div>
          </div>

          <!-- Tap hint -->
          <div style="
            font-size: 10px;
            color: #9ca3af;
            text-align: center;
            margin-top: 8px;
          ">Tryk for detaljer</div>
        </div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 15],
    popupAnchor: [0, 0],
  });
};

// Webcam marker icon - always points upward
const createWebcamIcon = (scale: number = 1) => {
  return divIcon({
    className: "webcam-marker",
    html: `
      <div style="position: relative; width: 20px; height: 20px; transform: scale(${scale * 1.3}); transform-origin: center bottom; pointer-events: none; overflow: visible;">
        <!-- Fixed anchor dot at center-bottom -->
        <div style="
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #7c3aed;
          box-shadow: 0 0 0 2px white, 0 2px 4px rgba(0,0,0,0.3);
          z-index: 10;
          pointer-events: auto;
          cursor: pointer;
        "></div>
        <!-- Stem pointing upward -->
        <div style="
          position: absolute;
          bottom: 15px;
          left: 50%;
          transform: translateX(-50%);
          width: 2px;
          height: 15px;
          background: #7c3aed;
          pointer-events: none;
        "></div>
        <!-- Icon container -->
        <div style="
          position: absolute;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
          padding: 10px;
          border-radius: 50%;
          box-shadow: 0 3px 10px rgba(124, 58, 237, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          pointer-events: auto;
          cursor: pointer;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 15],
    popupAnchor: [0, 5],
  });
};

// Component to handle map click events
function MapClickHandler({
  onMapClick,
  onClearSelection
}: {
  onMapClick: (lat: number, lng: number) => void;
  onClearSelection: () => void;
}) {
  const map = useMapEvents({
    click: (e) => {
      // Check if a popup or expanded badge is currently open
      const popupOpen = document.querySelector('.leaflet-popup') !== null;
      const expandedBadgeOpen = document.querySelector('.expanded-badge-marker') !== null;

      map.closePopup(); // Close any open spot popup
      onClearSelection(); // Clear selected spot

      // Only show temp badge if nothing was open
      if (!popupOpen && !expandedBadgeOpen) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
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

// Component to track zoom level
function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  return null;
}

// Component to handle locate me button
function LocateButton({ onLocate, onClear }: { onLocate: (lat: number, lng: number) => void; onClear: () => void }) {
  const map = useMap();
  const [locating, setLocating] = useState(false);

  const handleLocate = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Clear any existing temp badge immediately
    onClear();

    if (!navigator.geolocation) {
      alert("Geolocation understøttes ikke af din browser");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        map.flyTo([latitude, longitude], 14, { duration: 1.5 });
        // Show temp badge after flying
        setTimeout(() => {
          onLocate(latitude, longitude);
          setLocating(false);
        }, 1600);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Kunne ikke finde din placering");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <button
      onClick={handleLocate}
      onMouseDown={(e) => e.stopPropagation()}
      disabled={locating}
      className="absolute bottom-6 right-6 z-[1000] bg-white rounded-full p-3 shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      title="Find min placering"
    >
      {locating ? (
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      ) : (
        <LocateFixed className="w-6 h-6 text-primary" />
      )}
    </button>
  );
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

// DateTime picker component for selecting weather data time
function DateTimePicker({
  selectedDateTime,
  onChange,
  onReset
}: {
  selectedDateTime: Date;
  onChange: (date: Date) => void;
  onReset: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Format date for input (YYYY-MM-DD)
  const dateValue = useMemo(() => {
    const year = selectedDateTime.getFullYear();
    const month = String(selectedDateTime.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDateTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDateTime]);

  // Format time for display (HH:00)
  const timeValue = useMemo(() => {
    return String(selectedDateTime.getHours()).padStart(2, '0');
  }, [selectedDateTime]);

  // Check if selected time is default (today at 12:00)
  const isDefault = useMemo(() => {
    const now = new Date();
    return selectedDateTime.getFullYear() === now.getFullYear() &&
           selectedDateTime.getMonth() === now.getMonth() &&
           selectedDateTime.getDate() === now.getDate() &&
           selectedDateTime.getHours() === 12;
  }, [selectedDateTime]);

  // Format display text
  const displayText = useMemo(() => {
    if (isDefault) return "I dag kl. 12";
    const dayNames = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];
    const dayName = dayNames[selectedDateTime.getDay()];
    const day = selectedDateTime.getDate();
    const month = selectedDateTime.getMonth() + 1;
    const hour = String(selectedDateTime.getHours()).padStart(2, '0');
    return `${dayName} ${day}/${month} kl. ${hour}`;
  }, [selectedDateTime, isDefault]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [year, month, day] = e.target.value.split('-').map(Number);
    const newDate = new Date(selectedDateTime);
    newDate.setFullYear(year, month - 1, day);
    onChange(newDate);
  };

  const handleHourChange = (hour: number) => {
    const newDate = new Date(selectedDateTime);
    newDate.setHours(hour, 0, 0, 0);
    onChange(newDate);
  };

  // Generate hour options
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="absolute top-2 left-2 sm:top-6 sm:left-6 z-[1000] max-w-[calc(100vw-1rem)] sm:max-w-none" data-testid="datetime-picker">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Collapsed view - just shows current selection */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 hover:bg-gray-50 transition-colors w-full"
          data-testid="datetime-toggle"
        >
          <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
          <span className="font-medium text-xs sm:text-sm truncate" data-testid="datetime-display">{displayText}</span>
          {!isDefault && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="ml-1 sm:ml-2 p-0.5 sm:p-1 hover:bg-gray-200 rounded-full flex-shrink-0"
              title="Nulstil"
              data-testid="datetime-reset"
            >
              <RotateCcw className="w-3 h-3 text-gray-500" />
            </button>
          )}
        </button>

        {/* Expanded view - date and time picker */}
        {isExpanded && (
          <div className="border-t border-gray-100 p-2 sm:p-3" data-testid="datetime-expanded">
            {/* Date picker */}
            <div className="mb-2 sm:mb-3">
              <label className="text-xs text-gray-500 block mb-1">Dato</label>
              <input
                type="date"
                value={dateValue}
                onChange={handleDateChange}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                data-testid="datetime-date-input"
              />
            </div>

            {/* Hour picker - scrollable grid */}
            <div className="mb-2">
              <label className="text-xs text-gray-500 block mb-1">Klokkeslæt</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 max-h-28 sm:max-h-32 overflow-y-auto" data-testid="datetime-hour-grid">
                {hours.map(hour => (
                  <button
                    key={hour}
                    onClick={() => handleHourChange(hour)}
                    className={`py-1 px-1.5 sm:px-2 text-xs rounded ${
                      parseInt(timeValue) === hour
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    data-testid={`datetime-hour-${hour}`}
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset button */}
            <button
              onClick={() => {
                onReset();
                setIsExpanded(false);
              }}
              className="w-full py-1.5 sm:py-2 text-xs sm:text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
              data-testid="datetime-reset-full"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Nulstil
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Get default datetime (today at 12:00)
function getDefaultDateTime(): Date {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return now;
}

export default function MapView() {
  const [selectedDateTime, setSelectedDateTime] = useState<Date>(getDefaultDateTime);
  const { data: spots, isLoading, error } = useSpots(selectedDateTime);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tempBadgeCoords, setTempBadgeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState(10);
  const [selectedSpotId, setSelectedSpotId] = useState<number | null>(null);
  const searchString = useSearch();

  // Reset datetime to today at 12:00
  const handleResetDateTime = useCallback(() => {
    setSelectedDateTime(getDefaultDateTime());
  }, []);

  // Calculate badge scale based on zoom (slightly smaller when zoomed out)
  const badgeScale = useMemo(() => {
    // At zoom 8 or below: 0.75 scale, at zoom 12+: 1.0 scale
    return Math.min(1, Math.max(0.75, (currentZoom - 8) / 4));
  }, [currentZoom]);

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
            <MapClickHandler onMapClick={handleMapClick} onClearSelection={() => setSelectedSpotId(null)} />
            <ZoomTracker onZoomChange={setCurrentZoom} />
            <LocateButton
              onLocate={(lat, lng) => setTempBadgeCoords({ lat, lng })}
              onClear={() => setTempBadgeCoords(null)}
            />
            {targetLocation && (
              <FlyToLocation lat={targetLocation.lat} lng={targetLocation.lng} />
            )}

            {/* Webcam spots (not clustered) */}
            {spots?.filter(spot => spot.spotType === "webcam").map((spot) => (
              <Marker
                key={`webcam-${spot.id}-${currentZoom}`}
                position={[Number(spot.latitude), Number(spot.longitude)]}
                icon={createWebcamIcon(badgeScale)}
                eventHandlers={{
                  click: () => setTempBadgeCoords(null),
                }}
              >
                <Popup maxWidth={320} minWidth={280} closeButton={false} className="webcam-popup">
                  <div className="bg-purple-600 text-white p-3 -m-[13px] -mb-[14px] rounded-xl">
                    <a
                      href={`/spot/${spot.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/spot/${spot.id}`;
                      }}
                    >
                      <h3 className="font-bold text-sm mb-2 text-center text-white hover:text-purple-200 transition-colors cursor-pointer flex items-center justify-center gap-2">
                        <Video className="w-4 h-4" />
                        {spot.name}
                      </h3>
                    </a>
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
                      <p className="text-xs text-purple-200 mt-2 text-center">{spot.description}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Fishing spots (clustered) */}
            <MarkerClusterGroup
              key={`cluster-${currentZoom}`}
              chunkedLoading
              iconCreateFunction={createClusterIconFactory(spots, badgeScale)}
              maxClusterRadius={60}
              spiderfyOnMaxZoom={true}
              showCoverageOnHover={false}
            >
              {spots?.filter(spot => spot.spotType !== "webcam").map((spot) => (
                <Marker
                  key={`fish-${spot.id}-${spot.currentWaterTemp}-${spot.windSpeed}-${currentZoom}-${selectedSpotId === spot.id ? 'expanded' : 'normal'}`}
                  position={[Number(spot.latitude), Number(spot.longitude)]}
                  icon={selectedSpotId === spot.id
                    ? createExpandedBadge(spot, resolveImageUrl)
                    : createSpotIcon(
                        spot.currentWaterTemp,
                        spot.windSpeed,
                        spot.windDirection,
                        badgeScale
                      )
                  }
                  eventHandlers={{
                    click: (e) => {
                      setTempBadgeCoords(null);
                      if (selectedSpotId === spot.id) {
                        // Already expanded - navigate to detail page
                        window.location.href = `/spot/${spot.id}`;
                      } else {
                        // Expand this badge
                        setSelectedSpotId(spot.id);
                      }
                    },
                  }}
                  zIndexOffset={selectedSpotId === spot.id ? 1000 : 0}
                />
              ))}
            </MarkerClusterGroup>

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

        {/* DateTime picker */}
        <DateTimePicker
          selectedDateTime={selectedDateTime}
          onChange={setSelectedDateTime}
          onReset={handleResetDateTime}
        />

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

import { useSpot } from "@/hooks/use-spots";
import { Header } from "@/components/Header";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, Thermometer, Clock,
  Fish, Wind, Info, Navigation, TrendingUp, MapPin, Video, RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { resolveImageUrl } from "@/lib/image-url";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from "recharts";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useIsNative } from "@/hooks/use-platform";

// Simple dot marker for map preview
const createSpotMarkerIcon = () => {
  return divIcon({
    className: "spot-preview-marker",
    html: `
      <div style="
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #3b82f6;
        box-shadow: 0 0 0 3px white, 0 2px 8px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

// Mini map component showing spot location
function MiniMap({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card rounded-3xl p-8 shadow-xl border border-border/50"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold flex items-center">
          <MapPin className="w-6 h-6 text-primary mr-3" />
          Placering
        </h2>
        <Link
          href={`/map?lat=${lat}&lng=${lng}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm font-medium transition-colors"
        >
          Åbn kort
        </Link>
      </div>
      <div className="h-64 rounded-xl overflow-hidden">
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          attributionControl={false}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            pane="overlayPane"
          />
          <Marker
            position={[lat, lng]}
            icon={createSpotMarkerIcon()}
          />
        </MapContainer>
      </div>
      <p className="text-sm text-muted-foreground mt-3 text-center">
        {lat.toFixed(4)}°N, {lng.toFixed(4)}°Ø
      </p>
    </motion.div>
  );
}

// Webcam component that handles both iframe and image webcams, with optional timelapse video
function WebcamSection({ webcamUrl, timelapseUrl, spotName }: { webcamUrl: string; timelapseUrl?: string | null; spotName: string }) {
  const isImageWebcam = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(webcamUrl);
  const [imageKey, setImageKey] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshImage = useCallback(() => {
    setIsRefreshing(true);
    setImageKey(Date.now());
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  // Auto-refresh image webcams every 30 seconds
  useEffect(() => {
    if (!isImageWebcam) return;
    const interval = setInterval(refreshImage, 30000);
    return () => clearInterval(interval);
  }, [isImageWebcam, refreshImage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card rounded-3xl p-8 shadow-xl border border-border/50"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display font-bold flex items-center">
          <Video className="w-6 h-6 text-primary mr-3" />
          Live webcam
        </h2>
        <div className="flex items-center gap-2">
          {timelapseUrl && (
            <a
              href={timelapseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors"
            >
              Se timelapse
            </a>
          )}
          {isImageWebcam && (
            <button
              onClick={refreshImage}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Opdater
            </button>
          )}
        </div>
      </div>
      <div className="aspect-video rounded-xl overflow-hidden bg-muted">
        {isImageWebcam ? (
          <img
            key={imageKey}
            src={`${webcamUrl}${webcamUrl.includes('?') ? '&' : '?'}t=${imageKey}`}
            alt={`Webcam ved ${spotName}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <iframe
            src={webcamUrl}
            className="w-full h-full"
            frameBorder="0"
            allowFullScreen
            title={`Webcam ved ${spotName}`}
          />
        )}
      </div>
      {isImageWebcam && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Opdateres automatisk hvert 30. sekund
        </p>
      )}

    </motion.div>
  );
}

// Extract HH:mm in Danish timezone
const formatDanishTime = (input: string | Date | null): string => {
  if (!input) return "--:--";

  if (typeof input === "string") {
    // API returns time in Danish timezone, extract directly
    const match = input.match(/T(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : "--:--";
  }

  // If Date object, convert to Danish timezone
  return input.toLocaleTimeString('da-DK', {
    timeZone: 'Europe/Copenhagen',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

interface HistoricalDataPoint {
  time: string;
  temp: number | null;
  label: string;
  isFuture: boolean;
  position: number; // 0-100, with 50 being "now"
}

// Fetch 72 hours historical + 48 hours forecast water temperature
const useHistoricalWaterTemp = (lat: string, lng: string) => {
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowIndex, setNowIndex] = useState<number>(-1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Include past_days=3 and forecast_days=3 to get 72h past + 72h future
        const res = await fetch(
          `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}&hourly=sea_surface_temperature&past_days=3&forecast_days=3&timezone=Europe/Copenhagen`
        );
        if (res.ok) {
          const json = await res.json();
          const times: string[] = json.hourly?.time || [];
          const temps: (number | null)[] = json.hourly?.sea_surface_temperature || [];

          // Get current time in Danish timezone using Intl
          const nowDanish = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Copenhagen' });
          const nowParts = nowDanish.split(/[- :]/);
          const nowDate = new Date(
            parseInt(nowParts[0]),
            parseInt(nowParts[1]) - 1,
            parseInt(nowParts[2]),
            parseInt(nowParts[3])
          );

          // Filter to 72 hours past + 72 hours future
          const rawPoints: { time: string; temp: number | null; label: string; isFuture: boolean }[] = [];
          let foundNowIndex = -1;
          for (let i = 0; i < times.length; i++) {
            const time = times[i];
            // Parse the ISO string directly (API returns Danish time)
            // Format: "2024-01-08T14:00"
            const match = time.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
            if (!match) continue;

            const [, yearStr, monthStr, dayStr, hourStr] = match;
            const dataDate = new Date(
              parseInt(yearStr),
              parseInt(monthStr) - 1,
              parseInt(dayStr),
              parseInt(hourStr)
            );
            const hoursDiff = (dataDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60);

            // Include 72 hours past to 72 hours future
            if (hoursDiff >= -72 && hoursDiff <= 72) {
              const isFuture = hoursDiff > 0;
              if (!isFuture && foundNowIndex === -1) {
                foundNowIndex = rawPoints.length;
              }
              if (isFuture && foundNowIndex === -1) {
                foundNowIndex = rawPoints.length;
              }
              rawPoints.push({
                time,
                temp: temps[i],
                label: `${parseInt(dayStr)}/${parseInt(monthStr)} ${hourStr}:00`,
                isFuture
              });
            }
          }

          // Calculate positions: past points 0-50, future points 50-100
          const pastPoints = rawPoints.filter(p => !p.isFuture);
          const futurePoints = rawPoints.filter(p => p.isFuture);

          const points: HistoricalDataPoint[] = [
            ...pastPoints.map((p, i) => ({
              ...p,
              position: pastPoints.length > 1 ? (i / (pastPoints.length - 1)) * 50 : 0
            })),
            ...futurePoints.map((p, i) => ({
              ...p,
              position: futurePoints.length > 1 ? 50 + (i / (futurePoints.length - 1)) * 50 : 50
            }))
          ];

          setData(points);
          setNowIndex(pastPoints.length);
        }
      } catch (err) {
        console.error("Failed to fetch historical data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (lat && lng) {
      fetchData();
    }
  }, [lat, lng]);

  return { data, loading, nowIndex };
};

export default function SpotDetail() {
  const [, params] = useRoute("/spot/:id");
  const id = params ? parseInt(params.id) : 0;
  const { data: spot, isLoading, error } = useSpot(id);
  const { data: historicalData, loading: historyLoading, nowIndex } = useHistoricalWaterTemp(
    spot?.latitude || "",
    spot?.longitude || ""
  );
  const isNative = useIsNative();
  const nativeClass = isNative ? 'pt-[env(safe-area-inset-top)] pb-[calc(3.5rem+env(safe-area-inset-bottom))]' : '';

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-background ${nativeClass}`}>
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="h-8 w-32 bg-muted rounded animate-pulse mb-8" />
          <div className="h-[400px] w-full bg-muted rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !spot) {
    return (
      <div className={`min-h-screen bg-background flex flex-col ${nativeClass}`}>
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-destructive mb-4">Sted ikke fundet</h2>
            <Link href="/" className="text-primary hover:underline">Tilbage til forsiden</Link>
          </div>
        </div>
      </div>
    );
  }

  const isWebcam = spot.spotType === "webcam";

  // Simplified webcam view
  if (isWebcam) {
    return (
      <div className={`min-h-screen bg-background flex flex-col ${isNative ? 'pt-[env(safe-area-inset-top)] pb-[calc(3.5rem+env(safe-area-inset-bottom))]' : 'pb-20'}`}>
        <Header />

        {/* Back button bar */}
        <div className="bg-gradient-to-r from-purple-600 to-violet-500 py-4">
          <div className="container mx-auto px-4 md:px-6">
            <Link href="/" className="inline-flex items-center text-white/80 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Tilbage
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8">
          {/* Title and Map Link */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl md:text-5xl font-display font-bold text-purple-700 flex items-center gap-3"
            >
              <Video className="w-10 h-10" />
              {spot.name}
            </motion.h1>
            <Link
              href={`/map?lat=${spot.latitude}&lng=${spot.longitude}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-full text-sm font-medium transition-colors"
            >
              <MapPin className="w-4 h-4" />
              Se på kort
            </Link>
          </div>

          {/* Webcam Section */}
          {spot.webcamUrl && (
            <WebcamSection webcamUrl={spot.webcamUrl} timelapseUrl={spot.timelapseUrl} spotName={spot.name} />
          )}

          {/* Description */}
          {spot.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 bg-card rounded-3xl p-8 shadow-xl border border-border/50"
            >
              <h2 className="text-2xl font-display font-bold mb-4 flex items-center">
                <Info className="w-6 h-6 text-purple-600 mr-3" />
                Om dette webcam
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {spot.description}
              </p>
            </motion.div>
          )}

          {/* Mini Map for webcam */}
          <div className="mt-8">
            <MiniMap
              lat={Number(spot.latitude)}
              lng={Number(spot.longitude)}
              name={spot.name}
            />
          </div>
        </div>
      </div>
    );
  }

  // Full fishing spot view
  const waterTemp = spot.currentWaterTemp;
  const airTemp = spot.currentAirTemp;
  const windSpeed = spot.windSpeed;
  const windDirection = spot.windDirection;

  // Helper for safe number handling
  const safeWaterTemp = waterTemp != null ? waterTemp.toFixed(1) : "--";
  const safeAirTemp = airTemp != null ? airTemp.toFixed(1) : "--";

  // Helper to convert wind direction degrees to compass direction
  const getWindDirectionText = (degrees: number) => {
    const directions = ["N", "NØ", "Ø", "SØ", "S", "SV", "V", "NV"];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };

  return (
    <div className={`min-h-screen bg-background flex flex-col ${isNative ? 'pt-[env(safe-area-inset-top)] pb-[calc(3.5rem+env(safe-area-inset-bottom))]' : 'pb-20'}`}>
      <Header />

      {/* Back button bar */}
      <div className="bg-gradient-to-r from-blue-600 to-primary py-4">
        <div className="container mx-auto px-4 md:px-6">
          <Link href="/" className="inline-flex items-center text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Tilbage
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-8">
        {/* Title and Map Link */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-display font-bold text-primary flex items-center gap-3"
          >
            <Fish className="w-10 h-10" />
            {spot.name}
          </motion.h1>
          <Link
            href={`/map?lat=${spot.latitude}&lng=${spot.longitude}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm font-medium transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Se på kort
          </Link>
        </div>

        {/* Weather stats card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-b from-blue-500 to-primary text-white rounded-3xl p-6 shadow-xl shadow-blue-900/20 mb-8"
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold">{safeWaterTemp}°</div>
              <div className="text-sm opacity-80">Vand</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-200">{safeAirTemp}°</div>
              <div className="text-sm opacity-80">Luft</div>
            </div>
            <div>
              <div className="text-3xl font-bold flex items-center justify-center gap-1">
                {windSpeed != null ? windSpeed.toFixed(0) : "--"}
                {windDirection != null && (
                  <Navigation
                    className="w-5 h-5 opacity-70"
                    style={{ transform: `rotate(${windDirection + 180}deg)` }}
                  />
                )}
              </div>
              <div className="text-sm opacity-80">m/s</div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-8">
{spot.description && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-3xl p-8 shadow-xl border border-border/50"
              >
                <h2 className="text-2xl font-display font-bold mb-6 flex items-center">
                  <Info className="w-6 h-6 text-primary mr-3" />
                  Om dette sted
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {spot.description}
                </p>
              </motion.div>
            )}

            {/* Water Temperature Graph */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-3xl p-8 shadow-xl border border-border/50"
            >
              <h2 className="text-2xl font-display font-bold mb-6 flex items-center">
                <TrendingUp className="w-6 h-6 text-primary mr-3" />
                Vandtemperatur
              </h2>

              {historyLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">Indlæser data...</div>
                </div>
              ) : historicalData.length > 0 ? (
                <div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={historicalData.map((d, i) => ({
                          ...d,
                          pastTemp: d.isFuture ? null : d.temp,
                          futureTemp: d.isFuture ? d.temp : null,
                          // Connect past and future at the boundary
                          ...(i === nowIndex && !d.isFuture ? { futureTemp: d.temp } : {}),
                          ...(i === nowIndex - 1 && !d.isFuture ? { futureTemp: historicalData[nowIndex]?.temp } : {})
                        }))}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                      <defs>
                        <linearGradient id="pastTempGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="futureTempGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="position"
                        type="number"
                        domain={[0, 100]}
                        tick={false}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#9ca3af' }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        domain={[(dataMin: number) => Math.floor(dataMin - 0.5), (dataMax: number) => Math.ceil(dataMax + 0.5)]}
                        tickFormatter={(v) => `${v}°`}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                        formatter={(value: number, name: string) => [
                          `${value?.toFixed(1)}°C`,
                          name === 'futureTemp' ? 'Prognose' : 'Vandtemp'
                        ]}
                        labelFormatter={(_position, payload) => {
                          const items = payload as Array<{ payload?: { label?: string } }>;
                          if (items && items[0]) {
                            return items[0].payload?.label || '';
                          }
                          return '';
                        }}
                      />
                      {/* Now marker */}
                      <ReferenceLine
                        x={50}
                        stroke="#ef4444"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                      />
                      {/* Past data - solid line */}
                      <Area
                        type="monotone"
                        dataKey="pastTemp"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#pastTempGradient)"
                        connectNulls={false}
                      />
                      {/* Future data - dashed line */}
                      <Area
                        type="monotone"
                        dataKey="futureTemp"
                        stroke="#f97316"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="url(#futureTempGradient)"
                        connectNulls={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  </div>
                  {/* Date labels underneath - aligned with chart (40px left for Y-axis, 10px right margin) */}
                  <div className="flex justify-between items-start mt-4" style={{ marginLeft: 40, marginRight: 10 }}>
                    <div className="flex flex-col items-start bg-blue-50 px-3 py-2 rounded-lg">
                      <span className="text-sm font-semibold text-blue-800">{historicalData[0]?.label.split(' ')[0]}</span>
                      <span className="text-lg font-bold text-blue-600">{historicalData[0]?.temp?.toFixed(1)}°</span>
                    </div>
                    <div className="flex flex-col items-center bg-red-50 px-3 py-2 rounded-lg">
                      <span className="text-sm font-semibold text-red-800">Nu</span>
                      <span className="text-lg font-bold text-red-500">{historicalData[nowIndex - 1]?.temp?.toFixed(1)}°</span>
                    </div>
                    <div className="flex flex-col items-end bg-orange-50 px-3 py-2 rounded-lg">
                      <span className="text-sm font-semibold text-orange-800">{historicalData[historicalData.length - 1]?.label.split(' ')[0]}</span>
                      <span className="text-lg font-bold text-orange-500">{historicalData[historicalData.length - 1]?.temp?.toFixed(1)}°</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Ingen historiske data tilgængelig
                </div>
              )}
            </motion.div>

            {/* Mini Map */}
            <MiniMap
              lat={Number(spot.latitude)}
              lng={Number(spot.longitude)}
              name={spot.name}
            />
        </div>
      </div>
    </div>
  );
}

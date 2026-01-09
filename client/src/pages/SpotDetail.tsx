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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
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
      <div className="min-h-screen bg-background flex flex-col">
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
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <Header />
      
      {/* Detail Hero */}
      <div className="relative h-[60vh] min-h-[400px] bg-primary/10 overflow-hidden">
        {spot.imageUrl ? (
          <img
            src={resolveImageUrl(spot.imageUrl) || undefined}
            alt={spot.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-slate-800 flex items-center justify-center">
            <Fish className="w-32 h-32 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        <div className="absolute bottom-6 left-6 md:bottom-12 md:left-12 z-20">
          <Link href="/" className="inline-flex items-center text-white/80 hover:text-white transition-colors bg-black/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" /> Tilbage
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-20 relative z-10">
        {/* Title and Map Link */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-display font-bold text-primary"
          >
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-8">
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
                        labelFormatter={(position, payload) => {
                          if (payload && payload[0]) {
                            return payload[0].payload?.label || '';
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

            {/* Webcam Section */}
            {spot.webcamUrl && (
              <WebcamSection webcamUrl={spot.webcamUrl} timelapseUrl={spot.timelapseUrl} spotName={spot.name} />
            )}

          </div>

          {/* Sidebar - Temperature focus */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="sticky top-24"
            >
              <div className="bg-gradient-to-b from-blue-500 to-primary text-white rounded-3xl p-8 shadow-xl shadow-blue-900/20 overflow-hidden relative">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4 opacity-90">
                    <Thermometer className="w-6 h-6" />
                    <span className="text-lg font-medium">Vandtemperatur</span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-display font-bold">{safeWaterTemp}</span>
                    <span className="text-2xl opacity-60">°C</span>
                  </div>

                  <div className="h-2 bg-black/20 rounded-full mt-4 mb-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(((waterTemp || 0) / 20) * 100, 100)}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs opacity-60">
                    <span>0°C</span>
                    <span>10°C</span>
                    <span>20°C+</span>
                  </div>

                  {/* Air temperature */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-3 mb-2 opacity-90">
                      <Thermometer className="w-5 h-5 text-orange-300" />
                      <span className="text-base font-medium">Lufttemperatur</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-display font-bold text-orange-200">{safeAirTemp}</span>
                      <span className="text-lg opacity-60">°C</span>
                    </div>
                  </div>

                  {/* Wind */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-3 mb-2 opacity-90">
                      <Wind className="w-5 h-5" />
                      <span className="text-base font-medium">Vind</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-display font-bold">{windSpeed != null ? windSpeed.toFixed(0) : "--"}</span>
                      <span className="text-lg opacity-60">m/s</span>
                      {windDirection != null && (
                        <Navigation
                          className="w-6 h-6 ml-2"
                          style={{ transform: `rotate(${windDirection + 180}deg)` }}
                        />
                      )}
                    </div>
                  </div>

                  {spot.lastUpdated && (
                    <div className="mt-6 flex items-center gap-2 text-xs opacity-70">
                      <Clock className="w-4 h-4" />
                      <span>Opdateret kl. {formatDanishTime(spot.lastUpdated)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 p-6 rounded-3xl border border-border bg-white shadow-sm">
                <h3 className="font-bold mb-4">Tips til stedet</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    Bedst med waders for at nå dybere vand.
                  </li>
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    Tidlig morgen eller sen aften giver ofte de bedste resultater.
                  </li>
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    Tjek lokale regler for fredningstider.
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

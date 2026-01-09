import { Link } from "wouter";
import { Thermometer, Fish, MapPin, ArrowRight, Clock, Wind, Navigation, Video } from "lucide-react";
import { motion } from "framer-motion";
import type { FishingSpot } from "@shared/schema";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/image-url";
import { useState } from "react";

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

interface SpotCardProps {
  spot: FishingSpot;
  index: number;
}

// Helper to convert wind direction degrees to compass direction
const getWindDirectionText = (degrees: number) => {
  const directions = ["N", "NØ", "Ø", "SØ", "S", "SV", "V", "NV"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

export function SpotCard({ spot, index }: SpotCardProps) {
  const temp = spot.currentWaterTemp;
  const [imageError, setImageError] = useState(false);
  const isWebcam = spot.spotType === "webcam";

  // Temperature color logic
  const getTempColor = (t: number | null) => {
    if (t === null) return "text-gray-400";
    if (t < 5) return "text-blue-500";
    if (t < 12) return "text-teal-500";
    return "text-orange-500";
  };

  // Webcam card style
  if (isWebcam) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        className="group h-full"
      >
        <Link href={`/spot/${spot.id}`} className="block h-full outline-none">
          <div className="h-full bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl overflow-hidden shadow-lg border border-purple-200 hover:shadow-2xl hover:border-purple-400 transition-all duration-300 group-hover:-translate-y-1 flex flex-col">

            {/* Webcam Preview */}
            <div className="relative h-48 overflow-hidden bg-purple-100">
              {spot.webcamUrl ? (
                <img
                  src={`${spot.webcamUrl}${spot.webcamUrl.includes('?') ? '&' : '?'}t=${Date.now()}`}
                  alt={spot.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-200 to-violet-100 flex items-center justify-center">
                  <Video className="w-12 h-12 text-purple-300" />
                </div>
              )}

              {/* Webcam Badge */}
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full shadow-lg bg-purple-600 text-white flex items-center gap-2 text-sm font-semibold">
                <Video className="w-4 h-4" />
                Live Webcam
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-bold text-purple-800 group-hover:text-purple-600 transition-colors">
                  {spot.name}
                </h3>
              </div>

              <div className="flex items-center text-purple-600/70 text-sm mb-4">
                <MapPin className="w-4 h-4 mr-1 text-purple-500" />
                <span>{Number(spot.latitude).toFixed(4)}, {Number(spot.longitude).toFixed(4)}</span>
              </div>

              {spot.description && (
                <p className="text-purple-700/60 line-clamp-2 text-sm mb-6 flex-grow">
                  {spot.description}
                </p>
              )}

              <div className="mt-4 flex items-center text-purple-600 text-sm font-semibold group-hover:translate-x-1 transition-transform">
                Se webcam <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // Regular fishing spot card
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group h-full"
    >
      <Link href={`/spot/${spot.id}`} className="block h-full outline-none">
        <div className="h-full bg-card rounded-2xl overflow-hidden shadow-lg border border-border/50 hover:shadow-2xl hover:border-accent/30 transition-all duration-300 group-hover:-translate-y-1 flex flex-col">

          {/* Image Area */}
          <div className="relative h-48 overflow-hidden bg-muted">
            {spot.imageUrl && !imageError ? (
              <img
                src={resolveImageUrl(spot.imageUrl) || undefined}
                alt={spot.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-teal-50 flex items-center justify-center">
                <Fish className="w-12 h-12 text-blue-200" />
              </div>
            )}

            {/* Weather Badge - Floating */}
            <div className="absolute top-4 right-4 px-3 py-2 rounded-xl shadow-lg backdrop-blur-md border border-white/50 bg-white/90 flex flex-col items-end gap-0.5">
              <div className={cn("flex items-center gap-1.5 font-bold font-display text-sm", getTempColor(temp))}>
                <Thermometer className="w-3.5 h-3.5" />
                {temp != null ? `${temp.toFixed(1)}°` : "--"}
                <span className="text-xs text-muted-foreground font-normal">vand</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold font-display text-sm text-orange-500">
                <Thermometer className="w-3.5 h-3.5" />
                {spot.currentAirTemp != null ? `${spot.currentAirTemp.toFixed(1)}°` : "--"}
                <span className="text-xs text-muted-foreground font-normal">luft</span>
              </div>
              <div className="flex items-center gap-1.5 font-bold font-display text-sm text-gray-600">
                <Wind className="w-3.5 h-3.5" />
                {spot.windSpeed != null ? `${spot.windSpeed.toFixed(0)} m/s` : "--"}
                {spot.windDirection != null && (
                  <Navigation
                    className="w-3.5 h-3.5"
                    style={{ transform: `rotate(${spot.windDirection + 180}deg)` }}
                  />
                )}
              </div>
              {spot.lastUpdated && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Clock className="w-3 h-3" />
                  {formatDanishTime(spot.lastUpdated)}
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6 flex flex-col flex-grow">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                {spot.name}
              </h3>
            </div>

            <div className="flex items-center text-muted-foreground text-sm mb-4">
              <MapPin className="w-4 h-4 mr-1 text-accent" />
              <span>{Number(spot.latitude).toFixed(4)}, {Number(spot.longitude).toFixed(4)}</span>
            </div>

            {spot.description && (
              <p className="text-muted-foreground line-clamp-2 text-sm mb-6 flex-grow">
                {spot.description}
              </p>
            )}

            <div className="mt-4 flex items-center text-accent text-sm font-semibold group-hover:translate-x-1 transition-transform">
              Se detaljer <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

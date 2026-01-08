import { Link } from "wouter";
import { Thermometer, Fish, MapPin, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { FishingSpot } from "@shared/schema";
import { cn } from "@/lib/utils";

interface SpotCardProps {
  spot: FishingSpot;
  index: number;
}

export function SpotCard({ spot, index }: SpotCardProps) {
  const temp = spot.currentWaterTemp;
  
  // Temperature color logic
  const getTempColor = (t: number | null) => {
    if (t === null) return "text-gray-400";
    if (t < 5) return "text-blue-500";
    if (t < 12) return "text-teal-500";
    return "text-orange-500";
  };

  const getTempBg = (t: number | null) => {
    if (t === null) return "bg-gray-100";
    if (t < 5) return "bg-blue-50";
    if (t < 12) return "bg-teal-50";
    return "bg-orange-50";
  };

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
            {spot.imageUrl ? (
              <img 
                src={spot.imageUrl} 
                alt={spot.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-100 to-teal-50 flex items-center justify-center">
                <Fish className="w-12 h-12 text-blue-200" />
              </div>
            )}
            
            {/* Temperature Badge - Floating */}
            <div className={cn(
              "absolute top-4 right-4 px-4 py-2 rounded-xl shadow-lg backdrop-blur-md border border-white/50 flex items-center gap-2 font-bold font-display text-lg",
              getTempBg(temp),
              getTempColor(temp)
            )}>
              <Thermometer className="w-5 h-5" />
              {temp !== null ? `${temp.toFixed(1)}°C` : "--"}
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

            <p className="text-muted-foreground line-clamp-2 text-sm mb-6 flex-grow">
              {spot.description}
            </p>

            <div className="pt-4 border-t border-border/50 flex flex-wrap gap-2">
              {spot.bestFor.split(',').slice(0, 3).map((fish, i) => (
                <span 
                  key={i} 
                  className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-semibold uppercase tracking-wider"
                >
                  {fish.trim()}
                </span>
              ))}
              {spot.bestFor.split(',').length > 3 && (
                <span className="px-2.5 py-1 text-muted-foreground text-xs">
                  +{spot.bestFor.split(',').length - 3} more
                </span>
              )}
            </div>
            
            <div className="mt-4 flex items-center text-accent text-sm font-semibold group-hover:translate-x-1 transition-transform">
              View Details <ArrowRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

import { useSpot } from "@/hooks/use-spots";
import { Header } from "@/components/Header";
import { useRoute, Link } from "wouter";
import { 
  ArrowLeft, Thermometer, MapPin, Calendar, 
  Fish, Navigation, Wind, Info 
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function SpotDetail() {
  const [, params] = useRoute("/spot/:id");
  const id = params ? parseInt(params.id) : 0;
  const { data: spot, isLoading, error } = useSpot(id);

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
            <h2 className="text-2xl font-bold text-destructive mb-4">Spot Not Found</h2>
            <Link href="/" className="text-primary hover:underline">Return Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const temp = spot.currentWaterTemp;
  
  // Helper for safe number handling
  const safeTemp = temp !== null ? temp.toFixed(1) : "--";

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <Header />
      
      {/* Detail Hero */}
      <div className="relative h-[60vh] min-h-[400px] bg-primary/10 overflow-hidden">
        {spot.imageUrl ? (
          <img 
            src={spot.imageUrl} 
            alt={spot.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-slate-800 flex items-center justify-center">
            <Fish className="w-32 h-32 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="container mx-auto">
            <Link href="/" className="inline-flex items-center text-white/80 hover:text-white mb-6 transition-colors bg-black/20 backdrop-blur-md px-4 py-2 rounded-full text-sm font-medium">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to map
            </Link>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-display font-bold text-white mb-4 text-shadow-sm"
            >
              {spot.name}
            </motion.h1>
            
            <div className="flex flex-wrap items-center gap-6 text-white/90">
              <div className="flex items-center backdrop-blur-md bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                <MapPin className="w-5 h-5 mr-2 text-accent" />
                <span className="font-mono">{Number(spot.latitude).toFixed(4)}, {Number(spot.longitude).toFixed(4)}</span>
              </div>
              <div className="flex items-center backdrop-blur-md bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                <Calendar className="w-5 h-5 mr-2 text-accent" />
                <span>Updated today</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 -mt-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-3xl p-8 shadow-xl border border-border/50"
            >
              <h2 className="text-2xl font-display font-bold mb-6 flex items-center">
                <Info className="w-6 h-6 text-primary mr-3" />
                About this location
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {spot.description}
              </p>
              
              <div className="mt-8 pt-8 border-t border-border/50">
                <h3 className="text-lg font-bold mb-4">Target Species</h3>
                <div className="flex flex-wrap gap-3">
                  {spot.bestFor.split(',').map((fish, i) => (
                    <div key={i} className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg border border-secondary/50">
                      <Fish className="w-4 h-4 text-secondary-foreground/60" />
                      <span className="font-semibold text-secondary-foreground">{fish.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Simulated Conditions (Static for now as API only provides temp) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/50 rounded-2xl p-6 border border-border/50">
                <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                  <Wind className="w-5 h-5" />
                  <span className="font-medium">Wind Direction</span>
                </div>
                <div className="text-2xl font-bold text-foreground">W 4 m/s</div>
              </div>
              <div className="bg-white/50 rounded-2xl p-6 border border-border/50">
                <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                  <Navigation className="w-5 h-5" />
                  <span className="font-medium">Current</span>
                </div>
                <div className="text-2xl font-bold text-foreground">Moderate North</div>
              </div>
            </div>
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
                  <div className="flex items-center gap-3 mb-6 opacity-90">
                    <Thermometer className="w-6 h-6" />
                    <span className="text-lg font-medium">Sea Temperature</span>
                  </div>
                  
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-6xl font-display font-bold">{safeTemp}</span>
                    <span className="text-2xl opacity-60">°C</span>
                  </div>
                  
                  <div className="h-2 bg-black/20 rounded-full mt-6 mb-2 overflow-hidden">
                    <motion.div 
                      className="h-full bg-accent"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(((temp || 0) / 20) * 100, 100)}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs opacity-60">
                    <span>0°C</span>
                    <span>10°C</span>
                    <span>20°C+</span>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/10">
                    <p className="text-sm opacity-80 leading-relaxed">
                      {temp && temp < 6 ? "Cold water. Good for winter cod." : 
                       temp && temp < 12 ? "Prime sea trout temperature." : 
                       "Warmer water. Look for mackerel and garfish."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-6 rounded-3xl border border-border bg-white shadow-sm">
                <h3 className="font-bold mb-4">Location Tips</h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    Best fished with waders to reach the drop-off.
                  </li>
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    Early morning or late evening often yields best results.
                  </li>
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    Check local regulations for closed seasons.
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

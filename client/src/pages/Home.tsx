import { useSpots } from "@/hooks/use-spots";
import { Header } from "@/components/Header";
import { SpotCard } from "@/components/SpotCard";
import { Loader2, Waves, Search, AlertCircle, Fish, Video } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useIsNative } from "@/hooks/use-platform";

type FilterType = "all" | "fishing" | "webcam";

export default function Home() {
  const { data: spots, isLoading, error } = useSpots();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const isNative = useIsNative();

  const filteredSpots = spots?.filter(spot => {
    const matchesSearch = spot.name.toLowerCase().includes(searchTerm.toLowerCase());
    const spotType = spot.spotType || "fishing";
    const matchesFilter = filter === "all" || spotType === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className={`min-h-screen flex flex-col bg-background ${isNative ? 'pt-[env(safe-area-inset-top)] pb-[calc(3.5rem+env(safe-area-inset-bottom))]' : ''}`}>
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-10 md:py-14 overflow-hidden bg-primary/5">
        <div className="absolute inset-0 bg-[url('https://pixabay.com/get/gd15f9ca443fd1556bb5356f4e6d8ea88544b4dcb5d4f594a9e2478cd78ccbb33c888f339825730c9e6522211a9d2db25bad150fd124d1782ff46bc200348893a_1280.png')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-display font-bold text-primary mb-6 tracking-tight">
              Lystfiskeri i <span className="text-accent">Østjylland</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Find det perfekte sted til havørred, torsk og fladfisk langs den smukke
              østjyske kyst. Vandtemperaturer i realtid for bedre fangster.
            </p>

            {/* Search Bar */}
            <div className="max-w-md mx-auto relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Søg efter steder..."
                className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-border/50 bg-white shadow-xl shadow-primary/5 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all text-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setFilter("all")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  filter === "all"
                    ? "bg-primary text-white shadow-lg"
                    : "bg-white/80 text-muted-foreground hover:bg-white"
                }`}
              >
                Alle
              </button>
              <button
                onClick={() => setFilter("fishing")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  filter === "fishing"
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-white/80 text-muted-foreground hover:bg-white"
                }`}
              >
                <Fish className="w-4 h-4" />
                Fiskesteder
              </button>
              <button
                onClick={() => setFilter("webcam")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                  filter === "webcam"
                    ? "bg-purple-500 text-white shadow-lg"
                    : "bg-white/80 text-muted-foreground hover:bg-white"
                }`}
              >
                <Video className="w-4 h-4" />
                Webcams
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 md:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2">
            <Waves className="w-6 h-6 text-accent" />
            Populære steder
          </h2>
          <span className="text-sm text-muted-foreground font-medium">
            {filteredSpots ? `${filteredSpots.length} steder fundet` : 'Indlæser...'}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[420px] rounded-2xl bg-muted animate-pulse border border-border/50" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-red-50/50 rounded-3xl border border-red-100">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h3 className="text-xl font-bold text-destructive mb-2">Kunne ikke indlæse steder</h3>
            <p className="text-muted-foreground max-w-md">
              Vi kunne ikke hente fiskesteder. Tjek din forbindelse og prøv igen.
            </p>
          </div>
        ) : filteredSpots && filteredSpots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSpots.map((spot, index) => (
              <SpotCard key={spot.id} spot={spot} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">
              Ingen {filter === "webcam" ? "webcams" : filter === "fishing" ? "fiskesteder" : "steder"} fundet
              {searchTerm && ` for "${searchTerm}"`}
            </p>
            <button
              onClick={() => { setSearchTerm(""); setFilter("all"); }}
              className="mt-4 text-primary font-medium hover:underline underline-offset-4"
            >
              Nulstil filtre
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border/50 py-12">
        <div className="container mx-auto px-4 md:px-6 text-center text-muted-foreground">
          <p className="mb-4 font-display font-bold text-primary text-lg">Østjylland Lystfiskerguide</p>
          <p className="text-sm mb-8 max-w-md mx-auto">
            Pålidelige havtemperaturer og lokalitetsinfo for lystfiskere langs den danske kyst.
          </p>
          <p className="text-xs opacity-50">
            &copy; {new Date().getFullYear()} Østjylland Lystfiskeri. Data fra Open-Meteo.
          </p>
        </div>
      </footer>
    </div>
  );
}

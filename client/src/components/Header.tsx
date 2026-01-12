import { Link, useLocation } from "wouter";
import { Map, List, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

// Custom fish icon matching our app branding
function FishIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12 Q4 8 9 8 Q14 8 17 10 L19 9 L19 15 L17 14 Q14 16 9 16 Q4 16 2 12 Z"/>
      <path d="M10 8 Q12 4 14 8"/>
      <path d="M19 12 L22 9 M19 12 L22 15"/>
      <circle cx="5.5" cy="12" r="1" fill="currentColor"/>
      <path d="M7.5 10 Q7 12 7.5 14"/>
    </svg>
  );
}

export function Header() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-background/80 border-b border-border/40">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <FishIcon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-xl leading-none text-primary">Østjylland</span>
            <span className="text-xs text-muted-foreground font-medium tracking-widest uppercase">Lystfiskerguide</span>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              location === "/"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
            )}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Liste</span>
          </Link>
          <Link
            href="/map"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              location === "/map"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
            )}
          >
            <Map className="w-4 h-4" />
            <span className="hidden sm:inline">Kort</span>
          </Link>
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              location === "/admin"
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-primary hover:bg-primary/10"
            )}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

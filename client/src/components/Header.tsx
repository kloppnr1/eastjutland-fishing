import { Link, useLocation } from "wouter";
import { Map, List, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import logoImg from "/logo.png";

export function Header() {
  const [location] = useLocation();

  return (
    <>
      {/* Safe area cover for iOS notch */}
      <div className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top)] bg-background/95 backdrop-blur-lg z-50" />
      <header className="sticky top-[env(safe-area-inset-top)] z-50 w-full backdrop-blur-lg bg-background/95 border-b border-border/40">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <img
            src={logoImg}
            alt="Østjylland Lystfiskerguide"
            className="w-12 h-12 group-hover:scale-105 transition-transform"
          />
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
    </>
  );
}

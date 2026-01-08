import { Link } from "wouter";
import { Anchor } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-background/80 border-b border-border/40">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Anchor className="w-6 h-6 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-xl leading-none text-primary">Djursland</span>
            <span className="text-xs text-muted-foreground font-medium tracking-widest uppercase">Angling Guide</span>
          </div>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          <a href="#map" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Map View</a>
          <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">About</a>
          <button className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
            Current Conditions
          </button>
        </nav>
      </div>
    </header>
  );
}

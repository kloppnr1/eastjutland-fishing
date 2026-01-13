import { Link, useLocation } from "wouter";
import { Map, List, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: List, label: "Liste" },
    { href: "/map", icon: Map, label: "Kort" },
    { href: "/admin", icon: Settings, label: "Admin" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/40 pb-[env(safe-area-inset-bottom)] select-none">
      <div className="flex items-center justify-around h-9">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = location === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center justify-center gap-1.5 px-4 rounded-lg transition-colors h-full",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className={cn("text-xs", isActive && "font-semibold")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

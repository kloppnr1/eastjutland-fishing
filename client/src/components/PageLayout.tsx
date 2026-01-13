import { ReactNode } from "react";
import { useIsNative } from "@/hooks/use-platform";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className = "" }: PageLayoutProps) {
  const isNative = useIsNative();

  if (isNative) {
    return (
      <div className={`pt-[env(safe-area-inset-top)] pb-[calc(4rem+env(safe-area-inset-bottom))] ${className}`}>
        {children}
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

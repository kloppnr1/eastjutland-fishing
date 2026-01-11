import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useStaticSpots, useStaticSpot } from "./use-static-spots";

// Check if running in static mode
const STATIC_MODE = import.meta.env.VITE_STATIC_MODE === "true";

// GET /api/spots
export function useSpots(selectedDateTime?: Date) {
  const staticData = useStaticSpots(selectedDateTime);

  const serverQuery = useQuery({
    queryKey: [api.spots.list.path],
    queryFn: async () => {
      const res = await fetch(api.spots.list.path, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch fishing spots');
      return api.spots.list.responses[200].parse(await res.json());
    },
    enabled: !STATIC_MODE,
  });

  if (STATIC_MODE) {
    return {
      data: staticData.spots,
      isLoading: staticData.isLoading,
      error: staticData.error,
      // Expose static-specific methods
      addSpot: staticData.addSpot,
      deleteSpot: staticData.deleteSpot,
      refetch: staticData.refetch,
      selectedDateTime: staticData.selectedDateTime,
    };
  }

  return serverQuery;
}

// GET /api/spots/:id
export function useSpot(id: number) {
  const staticData = useStaticSpot(id);

  const serverQuery = useQuery({
    queryKey: [api.spots.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.spots.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch spot details');
      return api.spots.get.responses[200].parse(await res.json());
    },
    enabled: !STATIC_MODE && !!id,
  });

  if (STATIC_MODE) {
    return staticData;
  }

  return serverQuery;
}

// Export static mode check for components that need it
export const isStaticMode = STATIC_MODE;

import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

// GET /api/spots
export function useSpots() {
  return useQuery({
    queryKey: [api.spots.list.path],
    queryFn: async () => {
      const res = await fetch(api.spots.list.path, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch fishing spots');
      return api.spots.list.responses[200].parse(await res.json());
    },
  });
}

// GET /api/spots/:id
export function useSpot(id: number) {
  return useQuery({
    queryKey: [api.spots.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.spots.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to fetch spot details');
      return api.spots.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

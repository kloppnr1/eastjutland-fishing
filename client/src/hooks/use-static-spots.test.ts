import { describe, it, expect } from 'vitest';

// Test the tile calculation logic
const TILE_SIZE = 0.1;

function getTileKey(lat: number, lng: number): string {
  const tileLat = Math.floor(lat / TILE_SIZE) * TILE_SIZE;
  const tileLng = Math.floor(lng / TILE_SIZE) * TILE_SIZE;
  return `${tileLat.toFixed(1)}_${tileLng.toFixed(1)}`;
}

function getTileCenter(lat: number, lng: number): { lat: number; lng: number } {
  const tileLat = Math.floor(lat / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
  const tileLng = Math.floor(lng / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
  return { lat: tileLat, lng: tileLng };
}

describe('Tile-based weather caching', () => {
  describe('getTileKey', () => {
    it('should return same tile key for nearby spots', () => {
      // Two spots very close together should be in the same tile
      const spot1 = { lat: 56.245, lng: 10.342 };
      const spot2 = { lat: 56.248, lng: 10.348 };

      expect(getTileKey(spot1.lat, spot1.lng)).toBe(getTileKey(spot2.lat, spot2.lng));
    });

    it('should return different tile keys for distant spots', () => {
      // Spots in different tiles
      const spot1 = { lat: 56.245, lng: 10.342 }; // Kaløvig area
      const spot2 = { lat: 56.450, lng: 10.960 }; // Grenaa area

      expect(getTileKey(spot1.lat, spot1.lng)).not.toBe(getTileKey(spot2.lat, spot2.lng));
    });

    it('should handle tile boundary correctly', () => {
      // Just below and above a tile boundary
      const spot1 = { lat: 56.199, lng: 10.500 };
      const spot2 = { lat: 56.201, lng: 10.500 };

      // 56.199 -> tile 56.1, 56.201 -> tile 56.2
      expect(getTileKey(spot1.lat, spot1.lng)).toBe('56.1_10.5');
      expect(getTileKey(spot2.lat, spot2.lng)).toBe('56.2_10.5');
    });

    it('should produce consistent tile keys', () => {
      const lat = 56.2745;
      const lng = 10.4672;

      // Should always produce same key for same coordinates
      expect(getTileKey(lat, lng)).toBe('56.2_10.4');
      expect(getTileKey(lat, lng)).toBe(getTileKey(lat, lng));
    });
  });

  describe('getTileCenter', () => {
    it('should return center of tile', () => {
      const lat = 56.245;
      const lng = 10.342;

      const center = getTileCenter(lat, lng);

      // Tile is 56.2-56.3 lat, 10.3-10.4 lng
      // Center should be 56.25, 10.35
      expect(center.lat).toBeCloseTo(56.25, 2);
      expect(center.lng).toBeCloseTo(10.35, 2);
    });

    it('should return same center for all spots in tile', () => {
      const spots = [
        { lat: 56.201, lng: 10.301 },
        { lat: 56.250, lng: 10.350 },
        { lat: 56.299, lng: 10.399 },
      ];

      const centers = spots.map(s => getTileCenter(s.lat, s.lng));

      // All should have the same center
      expect(centers[0].lat).toBe(centers[1].lat);
      expect(centers[0].lng).toBe(centers[1].lng);
      expect(centers[1].lat).toBe(centers[2].lat);
      expect(centers[1].lng).toBe(centers[2].lng);
    });
  });

  describe('Real spot data tile grouping', () => {
    it('should group Aarhus harbor spots into same tile', () => {
      // These spots are all in Aarhus harbor area, should share a tile
      const spots = [
        { name: 'Sydmolen', lat: 56.139671, lng: 10.224114 },
        { name: 'Grønne fyr', lat: 56.161690, lng: 10.229119 },
      ];

      const tiles = spots.map(s => getTileKey(s.lat, s.lng));

      // Both should be in 56.1_10.2 tile
      expect(tiles[0]).toBe('56.1_10.2');
      expect(tiles[1]).toBe('56.1_10.2');
    });

    it('should separate distant spots into different tiles', () => {
      const spots = [
        { name: 'Ballehage', lat: 56.120289, lng: 10.227574 },
        { name: 'Jernhatten', lat: 56.2449, lng: 10.7869 },
        { name: 'Grenaa', lat: 56.4500, lng: 10.9600 },
        { name: 'Gjerrild Klint', lat: 56.5150, lng: 10.8639 },
      ];

      const tiles = new Set(spots.map(s => getTileKey(s.lat, s.lng)));

      // Should have 4 different tiles (all spots are far apart)
      expect(tiles.size).toBe(4);
    });

    it('should calculate how many tiles needed for all bundled spots', () => {
      // Sample of bundled spots
      const bundledSpots = [
        { lat: 56.2449, lng: 10.7869 },    // Jernhatten
        { lat: 56.4500, lng: 10.9600 },    // Grenaa
        { lat: 56.5150, lng: 10.8639 },    // Gjerrild Klint
        { lat: 56.2103, lng: 10.2884 },    // Egå Marina
        { lat: 56.2745, lng: 10.4672 },    // Kalø Slotsruin
        { lat: 56.2816, lng: 10.3857 },    // Gammel Løgten
        { lat: 56.4732, lng: 10.9120 },    // Sangstrup Klint
        { lat: 56.120289, lng: 10.227574 }, // Ballehage
        { lat: 56.139671, lng: 10.224114 }, // Sydmolen
        { lat: 56.150713, lng: 10.254938 }, // Østmolen
        { lat: 56.081122, lng: 10.253173 }, // Moesgaard
        { lat: 56.161690, lng: 10.229119 }, // Grønne fyr
        { lat: 56.177683, lng: 10.232225 }, // Den Permanente
        { lat: 56.179388, lng: 10.465937 }, // Begtrup Vig
      ];

      const tiles = new Set(bundledSpots.map(s => getTileKey(s.lat, s.lng)));

      console.log(`${bundledSpots.length} spots grouped into ${tiles.size} tiles`);
      console.log('Tiles:', Array.from(tiles).sort());

      // Should have significantly fewer tiles than spots
      expect(tiles.size).toBeLessThan(bundledSpots.length);
    });
  });
});

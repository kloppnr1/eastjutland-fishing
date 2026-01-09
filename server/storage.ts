import type { FishingSpot, InsertFishingSpot } from "@shared/schema";
import fs from "fs";
import path from "path";

const DATA_DIR = path.resolve(import.meta.dirname, "..", "data");
const SPOTS_FILE = path.join(DATA_DIR, "spots.json");

export interface IStorage {
  getAllSpots(): Promise<FishingSpot[]>;
  getSpot(id: number): Promise<FishingSpot | undefined>;
  createSpot(spot: InsertFishingSpot): Promise<FishingSpot>;
  updateSpot(id: number, updates: Partial<InsertFishingSpot>): Promise<FishingSpot>;
  deleteSpot(id: number): Promise<boolean>;
}

interface StoredData {
  spots: FishingSpot[];
  nextId: number;
}

export class FileStorage implements IStorage {
  private spots: FishingSpot[] = [];
  private nextId = 1;
  private initialized = false;

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private load() {
    if (this.initialized) return;

    this.ensureDataDir();

    if (fs.existsSync(SPOTS_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(SPOTS_FILE, "utf-8")) as StoredData;
        this.spots = data.spots.map(spot => ({
          ...spot,
          lastUpdated: spot.lastUpdated ? new Date(spot.lastUpdated) : null,
        }));
        this.nextId = data.nextId;
        console.log(`Loaded ${this.spots.length} spots from file`);
      } catch (err) {
        console.error("Failed to load spots file:", err);
        this.spots = [];
        this.nextId = 1;
      }
    }

    this.initialized = true;
  }

  private save() {
    this.ensureDataDir();

    const data: StoredData = {
      spots: this.spots,
      nextId: this.nextId,
    };

    fs.writeFileSync(SPOTS_FILE, JSON.stringify(data, null, 2), "utf-8");
  }

  async getAllSpots(): Promise<FishingSpot[]> {
    this.load();
    return [...this.spots].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getSpot(id: number): Promise<FishingSpot | undefined> {
    this.load();
    return this.spots.find(s => s.id === id);
  }

  async createSpot(spot: InsertFishingSpot): Promise<FishingSpot> {
    this.load();

    const newSpot: FishingSpot = {
      id: this.nextId++,
      name: spot.name,
      latitude: spot.latitude,
      longitude: spot.longitude,
      description: spot.description ?? null,
      bestFor: spot.bestFor ?? null,
      imageUrl: spot.imageUrl ?? null,
      webcamUrl: (spot as any).webcamUrl ?? null,
      currentWaterTemp: null,
      currentAirTemp: null,
      windSpeed: null,
      windDirection: null,
      lastUpdated: null,
    };
    this.spots.push(newSpot);
    this.save();
    return newSpot;
  }

  async updateSpot(id: number, updates: Partial<InsertFishingSpot>): Promise<FishingSpot> {
    this.load();

    const spot = this.spots.find(s => s.id === id);
    if (!spot) throw new Error(`Spot ${id} not found`);

    if (updates.name !== undefined) spot.name = updates.name;
    if (updates.latitude !== undefined) spot.latitude = updates.latitude;
    if (updates.longitude !== undefined) spot.longitude = updates.longitude;
    if (updates.description !== undefined) spot.description = updates.description;
    if (updates.bestFor !== undefined) spot.bestFor = updates.bestFor;
    if (updates.imageUrl !== undefined) spot.imageUrl = updates.imageUrl;
    if ((updates as any).webcamUrl !== undefined) spot.webcamUrl = (updates as any).webcamUrl;

    this.save();
    return spot;
  }

  async deleteSpot(id: number): Promise<boolean> {
    this.load();

    const index = this.spots.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.spots.splice(index, 1);
    this.save();
    return true;
  }
}

export const storage = new FileStorage();

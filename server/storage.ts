import { db } from "./db";
import { fishingSpots, type FishingSpot, type InsertFishingSpot } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getAllSpots(): Promise<FishingSpot[]>;
  getSpot(id: number): Promise<FishingSpot | undefined>;
  createSpot(spot: InsertFishingSpot): Promise<FishingSpot>;
  updateSpotTemp(id: number, temp: number): Promise<FishingSpot>;
}

export class DatabaseStorage implements IStorage {
  async getAllSpots(): Promise<FishingSpot[]> {
    return await db.select().from(fishingSpots).orderBy(fishingSpots.name);
  }

  async getSpot(id: number): Promise<FishingSpot | undefined> {
    const [spot] = await db.select().from(fishingSpots).where(eq(fishingSpots.id, id));
    return spot;
  }

  async createSpot(spot: InsertFishingSpot): Promise<FishingSpot> {
    const [newSpot] = await db.insert(fishingSpots).values(spot).returning();
    return newSpot;
  }

  async updateSpotTemp(id: number, temp: number): Promise<FishingSpot> {
    const [updated] = await db
      .update(fishingSpots)
      .set({ 
        currentWaterTemp: temp,
        lastUpdated: new Date()
      })
      .where(eq(fishingSpots.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();

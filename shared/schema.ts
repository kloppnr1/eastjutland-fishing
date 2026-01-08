import { pgTable, text, serial, numeric, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const fishingSpots = pgTable("fishing_spots", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  latitude: numeric("latitude").notNull(),
  longitude: numeric("longitude").notNull(),
  description: text("description").notNull(),
  bestFor: text("best_for").notNull(), // Comma separated species
  currentWaterTemp: real("current_water_temp"),
  lastUpdated: timestamp("last_updated"),
  imageUrl: text("image_url"),
});

export const insertFishingSpotSchema = createInsertSchema(fishingSpots).omit({ 
  id: true,
  lastUpdated: true,
  currentWaterTemp: true 
});

export type FishingSpot = typeof fishingSpots.$inferSelect;
export type InsertFishingSpot = z.infer<typeof insertFishingSpotSchema>;

export type FishingSpotResponse = FishingSpot;

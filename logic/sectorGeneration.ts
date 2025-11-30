import { SolarSystem, Coordinates } from "../types";
import { SECTOR_SIZE, PASSIVE_SCAN_RANGE } from "../constants";
import { generateSystemsForSector } from "../utils/gameHelpers";

export interface SectorGenerationResult {
  generated: boolean;
  sectorKey?: string;
  newSystems: SolarSystem[];
}

export interface PassiveScanResult {
  systemUpdates: { index: number; updates: Partial<SolarSystem> }[];
  logMessages: string[];
}

/**
 * Check if probe has entered a new sector and generate systems if needed
 */
export const checkSectorGeneration = (
  position: Coordinates,
  generatedSectors: Set<string>,
  earthPos: Coordinates,
  currentSystemCount: number
): SectorGenerationResult => {
  const sectorX = Math.floor(position.x / SECTOR_SIZE);
  const sectorY = Math.floor(position.y / SECTOR_SIZE);
  const sectorKey = `${sectorX},${sectorY}`;

  if (!generatedSectors.has(sectorKey)) {
    const newSystems = generateSystemsForSector(sectorX, sectorY, earthPos);
    return {
      generated: true,
      sectorKey,
      newSystems,
    };
  }

  return {
    generated: false,
    newSystems: [],
  };
};

/**
 * Perform passive scanning to discover nearby systems
 * Returns system updates and log messages (with {probeName} placeholder)
 */
export const performPassiveScan = (
  position: Coordinates,
  systems: SolarSystem[]
): PassiveScanResult => {
  const systemUpdates: { index: number; updates: Partial<SolarSystem> }[] = [];
  const logMessages: string[] = [];

  systems.forEach((sys, idx) => {
    if (!sys.discovered) {
      const dist = Math.hypot(
        sys.position.x - position.x,
        sys.position.y - position.y
      );
      if (dist <= PASSIVE_SCAN_RANGE) {
        systemUpdates.push({
          index: idx,
          updates: { discovered: true },
        });
        logMessages.push(
          `Proximity Alert: ${sys.name} detected by {probeName}.`
        );
      }
    }
  });

  return { systemUpdates, logMessages };
};

import { ProbeModel, ProbeBlueprint } from "./types";

export const UNIVERSE_WIDTH = 2000;
export const UNIVERSE_HEIGHT = 2000;
export const SYSTEM_COUNT = 30;
export const SECTOR_SIZE = 1000; // Dimensions of a procedural sector

export const FUEL_CONSUMPTION_RATE = 0.2; // Plutonium per unit distance (Increased for balance)
export const MINING_TICK_RATE = 100; // ms per tick
export const PASSIVE_SCAN_RANGE = 150; // Distance to passively discover systems while traveling
export const TURN_COST_PER_DEGREE = 0.2; // Plutonium cost per degree of turn (Increased for balance)
export const SOLAR_SAIL_SPEED_MULTIPLIER = 0.05; // Speed multiplier when out of fuel

// Base costs for an empty chassis
export const BASE_COST = {
  Metal: 10,
  Plutonium: 10,
  Time: 30000, // 30s base time
};

// Cost per point of stat
export const COST_MULTIPLIERS = {
  miningSpeed: { Metal: 100, Plutonium: 20 },
  flightSpeed: { Metal: 150, Plutonium: 100 }, // Expensive engines
  replicationSpeed: { Metal: 50, Plutonium: 50 }, // Complex machinery
  scanRange: { Metal: 0.2, Plutonium: 0.05 }, // Per LY
  scanSpeed: { Metal: 10, Plutonium: 10 },
  autonomyLevel: { Metal: 500, Plutonium: 200 }, // Expensive AI cores
  timeFactor: 200, // ms added per unit of total resource cost
};

// Upgrade Configuration
export const UPGRADE_COSTS = {
  miningSpeed: {
    Metal: 100,
    Plutonium: 10,
    increment: 1,
    name: "Carbide Drills",
  },
  flightSpeed: {
    Metal: 100,
    Plutonium: 20,
    increment: 1,
    name: "Ion Thrusters",
  },
  scanRange: { Metal: 50, Plutonium: 5, increment: 50, name: "Sensor Array" },
  scanSpeed: { Metal: 80, Plutonium: 10, increment: 0.5, name: "Quantum CPU" },
  replicationSpeed: {
    Metal: 200,
    Plutonium: 50,
    increment: 0.5,
    name: "Nano-Assembler",
  },
  autonomyLevel: {
    Metal: 500,
    Plutonium: 200,
    increment: 1,
    name: "Neural Core",
  },
};

// Maximum stat levels
export const MAX_STAT_LEVELS = {
  miningSpeed: 10,
  flightSpeed: 10,
  replicationSpeed: 5,
  scanRange: 1000, // 300 base + (50 * 14 upgrades)
  scanSpeed: 5, // 1 base + (0.5 * 10 upgrades)
  autonomyLevel: 2,
};

// Default Stats for reference and backward compatibility
export const PROBE_STATS: Record<
  ProbeModel,
  {
    miningSpeed: number;
    flightSpeed: number;
    replicationSpeed: number;
    scanRange: number;
    scanSpeed: number;
    autonomyLevel: number;
  }
> = {
  [ProbeModel.MarkI]: {
    miningSpeed: 1,
    flightSpeed: 1,
    replicationSpeed: 1,
    scanRange: 300,
    scanSpeed: 1,
    autonomyLevel: 0,
  },
  [ProbeModel.MarkII]: {
    miningSpeed: 1,
    flightSpeed: 3,
    replicationSpeed: 1,
    scanRange: 450,
    scanSpeed: 1.5,
    autonomyLevel: 0,
  },
  [ProbeModel.MarkIII]: {
    miningSpeed: 4,
    flightSpeed: 1,
    replicationSpeed: 1,
    scanRange: 300,
    scanSpeed: 1,
    autonomyLevel: 0,
  },
  [ProbeModel.VonNeumannPrime]: {
    miningSpeed: 3,
    flightSpeed: 2,
    replicationSpeed: 3,
    scanRange: 600,
    scanSpeed: 2,
    autonomyLevel: 0,
  },
};

// Initial Blueprints derived from the stats above + manual cost tuning to match legacy balance
export const DEFAULT_BLUEPRINTS: ProbeBlueprint[] = [
  {
    id: "bp-mark1",
    name: ProbeModel.MarkI,
    stats: PROBE_STATS[ProbeModel.MarkI],
    cost: { Metal: 50, Plutonium: 20, time: 60000 },
    isCustom: false,
  },
  {
    id: "bp-mark2",
    name: ProbeModel.MarkII,
    stats: PROBE_STATS[ProbeModel.MarkII],
    cost: { Metal: 150, Plutonium: 80, time: 90000 },
    isCustom: false,
  },
  {
    id: "bp-mark3",
    name: ProbeModel.MarkIII,
    stats: PROBE_STATS[ProbeModel.MarkIII],
    cost: { Metal: 200, Plutonium: 50, time: 120000 },
    isCustom: false,
  },
  {
    id: "bp-vonneumann",
    name: ProbeModel.VonNeumannPrime,
    stats: PROBE_STATS[ProbeModel.VonNeumannPrime],
    cost: { Metal: 500, Plutonium: 300, time: 180000 },
    isCustom: false,
  },
  {
    id: "bp-admin",
    name: "Admin Super Probe",
    stats: {
      miningSpeed: 1,
      flightSpeed: 4,
      replicationSpeed: 5,
      scanRange: 1000,
      scanSpeed: 50,
      autonomyLevel: 2,
    },
    cost: { Metal: 10, Plutonium: 10, time: 1000 },
    isCustom: false,
    initialInventory: { Metal: 10000, Plutonium: 10000 },
  },
];

// Deprecated: Kept for reference only, logic now uses blueprints
export const PROBE_COSTS: Record<
  ProbeModel,
  { Metal: number; Plutonium: number; time: number }
> = {
  [ProbeModel.MarkI]: { Metal: 50, Plutonium: 20, time: 60000 },
  [ProbeModel.MarkII]: { Metal: 150, Plutonium: 80, time: 90000 },
  [ProbeModel.MarkIII]: { Metal: 200, Plutonium: 50, time: 120000 },
  [ProbeModel.VonNeumannPrime]: { Metal: 500, Plutonium: 300, time: 180000 },
};

import { ProbeModel, ProbeBlueprint, AIBehavior } from "./types";

export const UNIVERSE_WIDTH = 2000;
export const UNIVERSE_HEIGHT = 2000;
export const SECTOR_SIZE = 1000; // Dimensions of a procedural sector

export const FUEL_CONSUMPTION_RATE = 0.2; // Plutonium per unit distance (Increased for balance)
export const MINING_TICK_RATE = 100; // ms per tick
export const PASSIVE_SCAN_RANGE = 150; // Distance to passively discover systems while traveling
export const TURN_COST_PER_DEGREE = 0.2; // Plutonium cost per degree of turn (Increased for balance)
export const SOLAR_SAIL_SPEED_MULTIPLIER = 0.05; // Speed multiplier when out of fuel

// Research & Science
export const RESEARCH_RATE_BASE = 2; // Science per second at scanSpeed=1
export const SCIENCE_DISTANCE_FACTOR = 0.002; // Multiplier per unit distance from Earth
export const SCIENCE_BASE_PER_SYSTEM = 20; // Base science even near Earth

// Relay Network
export const RELAY_DEPLOY_COST_METAL = 400; // Metal required to deploy a relay

// Science Unlocks - Type-safe IDs
export const SCIENCE_UNLOCK_IDS = {
  // Tier 1
  MINING_ADVANCED: "mining_advanced",
  PROPULSION_IMPROVED: "propulsion_improved",
  SENSORS_ENHANCED: "sensors_enhanced",
  FABRICATION_FASTER: "fabrication_faster",
  // Tier 2
  MINING_EXPERT: "mining_expert",
  PROPULSION_MASTERY: "propulsion_mastery",
  SENSORS_DEEP: "sensors_deep",
  SENSORS_PROCESSING: "sensors_processing",
  FABRICATION_ADVANCED: "fabrication_advanced",
  // Tier 3
  MINING_ULTIMATE: "mining_ultimate",
  PROPULSION_ULTIMATE: "propulsion_ultimate",
  SENSORS_ULTIMATE: "sensors_ultimate",
  FABRICATION_ULTIMATE: "fabrication_ultimate",
  // Special
  RELAY_NETWORK: "relay_network",
  // AI Behaviors
  AI_BEHAVIOR_PROTOCOLS: "ai_behavior_protocols",
  FOCUS_MINING_MODULE: "focus_mining_module",
  FOCUS_EXPLORING_MODULE: "focus_exploring_module",
  FOCUS_SCIENCE_MODULE: "focus_science_module",
} as const;

export type ScienceUnlockId =
  (typeof SCIENCE_UNLOCK_IDS)[keyof typeof SCIENCE_UNLOCK_IDS];

export interface ScienceUnlock {
  id: ScienceUnlockId;
  name: string;
  description: string;
  category: "mining" | "propulsion" | "sensors" | "fabrication" | "ai";
  cost: number;
  prerequisites?: ScienceUnlockId[]; // Type-safe IDs
  effect: {
    type: "increase_max_level" | "new_capability" | "efficiency_boost";
    target?: keyof typeof MAX_STAT_LEVELS;
    value?: number;
  };
}

export const SCIENCE_UNLOCKS: ScienceUnlock[] = [
  // Tier 1 - Basic Improvements (500-800 science)
  {
    id: SCIENCE_UNLOCK_IDS.MINING_ADVANCED,
    name: "Advanced Drill Matrix",
    description: "Increase Mining Speed max level to 15 (+5 levels)",
    category: "mining",
    cost: 500,
    effect: { type: "increase_max_level", target: "miningSpeed", value: 5 },
  },
  {
    id: SCIENCE_UNLOCK_IDS.PROPULSION_IMPROVED,
    name: "Improved Ion Drive",
    description: "Increase Flight Speed max level to 15 (+5 levels)",
    category: "propulsion",
    cost: 600,
    effect: { type: "increase_max_level", target: "flightSpeed", value: 5 },
  },
  {
    id: SCIENCE_UNLOCK_IDS.SENSORS_ENHANCED,
    name: "Enhanced Sensor Suite",
    description: "Increase Scan Range max to 1500 LY (+500 LY)",
    category: "sensors",
    cost: 700,
    effect: { type: "increase_max_level", target: "scanRange", value: 500 },
  },
  {
    id: SCIENCE_UNLOCK_IDS.FABRICATION_FASTER,
    name: "Parallel Assembly",
    description: "Increase Replication Speed max level to 8 (+3 levels)",
    category: "fabrication",
    cost: 800,
    effect: {
      type: "increase_max_level",
      target: "replicationSpeed",
      value: 3,
    },
  },

  // Tier 2 - Specialized Upgrades (1200-1800 science)
  {
    id: SCIENCE_UNLOCK_IDS.MINING_EXPERT,
    name: "Quantum Excavation",
    description: "Increase Mining Speed max level to 20 (+5 more levels)",
    category: "mining",
    cost: 1200,
    prerequisites: [SCIENCE_UNLOCK_IDS.MINING_ADVANCED],
    effect: { type: "increase_max_level", target: "miningSpeed", value: 5 },
  },
  {
    id: SCIENCE_UNLOCK_IDS.PROPULSION_MASTERY,
    name: "Plasma Thruster Arrays",
    description: "Increase Flight Speed max level to 20 (+5 more levels)",
    category: "propulsion",
    cost: 1500,
    prerequisites: [SCIENCE_UNLOCK_IDS.PROPULSION_IMPROVED],
    effect: { type: "increase_max_level", target: "flightSpeed", value: 5 },
  },
  {
    id: SCIENCE_UNLOCK_IDS.SENSORS_DEEP,
    name: "Deep Space Telemetry",
    description: "Increase Scan Range max to 2500 LY (+1000 LY)",
    category: "sensors",
    cost: 1800,
    prerequisites: [SCIENCE_UNLOCK_IDS.SENSORS_ENHANCED],
    effect: { type: "increase_max_level", target: "scanRange", value: 1000 },
  },
  {
    id: SCIENCE_UNLOCK_IDS.SENSORS_PROCESSING,
    name: "Neural Scan Processing",
    description: "Increase Scan Speed max to 10x (+5x)",
    category: "sensors",
    cost: 1600,
    prerequisites: [SCIENCE_UNLOCK_IDS.SENSORS_ENHANCED],
    effect: { type: "increase_max_level", target: "scanSpeed", value: 5 },
  },
  {
    id: SCIENCE_UNLOCK_IDS.FABRICATION_ADVANCED,
    name: "Molecular Synthesis",
    description: "Increase Replication Speed max level to 12 (+4 more levels)",
    category: "fabrication",
    cost: 1400,
    prerequisites: [SCIENCE_UNLOCK_IDS.FABRICATION_FASTER],
    effect: {
      type: "increase_max_level",
      target: "replicationSpeed",
      value: 4,
    },
  },

  // Tier 3 - Elite Mastery (2500-4000 science)
  {
    id: SCIENCE_UNLOCK_IDS.MINING_ULTIMATE,
    name: "Zero-Point Extractors",
    description: "Increase Mining Speed max level to 30 (+10 more levels)",
    category: "mining",
    cost: 2500,
    prerequisites: [SCIENCE_UNLOCK_IDS.MINING_EXPERT],
    effect: { type: "increase_max_level", target: "miningSpeed", value: 10 },
  },
  {
    id: SCIENCE_UNLOCK_IDS.PROPULSION_ULTIMATE,
    name: "Warp Field Generators",
    description: "Increase Flight Speed max level to 30 (+10 more levels)",
    category: "propulsion",
    cost: 3000,
    prerequisites: [SCIENCE_UNLOCK_IDS.PROPULSION_MASTERY],
    effect: { type: "increase_max_level", target: "flightSpeed", value: 10 },
  },
  {
    id: SCIENCE_UNLOCK_IDS.SENSORS_ULTIMATE,
    name: "Quantum Entanglement Array",
    description: "Increase Scan Range max to 5000 LY (+2500 LY)",
    category: "sensors",
    cost: 3500,
    prerequisites: [SCIENCE_UNLOCK_IDS.SENSORS_DEEP],
    effect: { type: "increase_max_level", target: "scanRange", value: 2500 },
  },
  {
    id: SCIENCE_UNLOCK_IDS.FABRICATION_ULTIMATE,
    name: "Von Neumann Perfection",
    description: "Increase Replication Speed max level to 20 (+8 more levels)",
    category: "fabrication",
    cost: 4000,
    prerequisites: [SCIENCE_UNLOCK_IDS.FABRICATION_ADVANCED],
    effect: {
      type: "increase_max_level",
      target: "replicationSpeed",
      value: 8,
    },
  },

  // Special Capability Unlocks
  {
    id: SCIENCE_UNLOCK_IDS.RELAY_NETWORK,
    name: "Quantum Relay Network",
    description:
      "Unlock ability to deploy relay stations for long-range communication",
    category: "sensors",
    cost: 400,
    effect: { type: "new_capability", value: 0 },
  },

  // AI Behavior Unlocks
  {
    id: SCIENCE_UNLOCK_IDS.AI_BEHAVIOR_PROTOCOLS,
    name: "AI Behavior Protocols",
    description:
      "Unlock the ability to install specialized behavior modules on probes",
    category: "ai",
    cost: 1000,
    effect: { type: "new_capability", value: 0 },
  },
  {
    id: SCIENCE_UNLOCK_IDS.FOCUS_MINING_MODULE,
    name: "Focus Mining Module",
    description:
      "Allows probes to autonomously seek and mine resource-rich systems",
    category: "ai",
    cost: 1500,
    prerequisites: [SCIENCE_UNLOCK_IDS.AI_BEHAVIOR_PROTOCOLS],
    effect: { type: "new_capability", value: 0 },
  },
  {
    id: SCIENCE_UNLOCK_IDS.FOCUS_EXPLORING_MODULE,
    name: "Focus Exploring Module",
    description:
      "Allows probes to autonomously explore and map uncharted space",
    category: "ai",
    cost: 1500,
    prerequisites: [SCIENCE_UNLOCK_IDS.AI_BEHAVIOR_PROTOCOLS],
    effect: { type: "new_capability", value: 0 },
  },
  {
    id: SCIENCE_UNLOCK_IDS.FOCUS_SCIENCE_MODULE,
    name: "Focus Science Module",
    description:
      "Allows probes to autonomously collect science and deploy relays",
    category: "ai",
    cost: 2000,
    prerequisites: [SCIENCE_UNLOCK_IDS.FOCUS_EXPLORING_MODULE],
    effect: { type: "new_capability", value: 0 },
  },
];

export const CATEGORY_COLORS = {
  mining: {
    bg: "bg-yellow-900/30",
    border: "border-yellow-800",
    text: "text-yellow-400",
  },
  propulsion: {
    bg: "bg-teal-900/30",
    border: "border-teal-800",
    text: "text-teal-400",
  },
  sensors: {
    bg: "bg-indigo-900/30",
    border: "border-indigo-800",
    text: "text-indigo-400",
  },
  fabrication: {
    bg: "bg-emerald-900/30",
    border: "border-emerald-800",
    text: "text-emerald-400",
  },
  ai: {
    bg: "bg-purple-900/30",
    border: "border-purple-800",
    text: "text-purple-400",
  },
};

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
    Metal: 50,
    Plutonium: 5,
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

// AI Module Installation Costs
export const AI_MODULE_COSTS = {
  [AIBehavior.FocusMining]: { Metal: 150, Plutonium: 0 },
  [AIBehavior.FocusExploring]: { Metal: 100, Plutonium: 50 },
  [AIBehavior.FocusScience]: { Metal: 200, Plutonium: 100 },
};

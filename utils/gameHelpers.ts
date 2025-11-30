import {
  GameState,
  SolarSystem,
  Probe,
  ResourceType,
  ProbeState,
  ProbeModel,
  Coordinates,
} from "../types";
import {
  UNIVERSE_WIDTH,
  UNIVERSE_HEIGHT,
  SECTOR_SIZE,
  PROBE_STATS,
  DEFAULT_BLUEPRINTS,
  SCIENCE_DISTANCE_FACTOR,
  SCIENCE_BASE_PER_SYSTEM,
} from "../constants";

export const generateCoordinatesInSector = (
  sectorX: number,
  sectorY: number
): Coordinates => {
  return {
    x:
      sectorX * SECTOR_SIZE +
      Math.floor(Math.random() * (SECTOR_SIZE - 100)) +
      50,
    y:
      sectorY * SECTOR_SIZE +
      Math.floor(Math.random() * (SECTOR_SIZE - 100)) +
      50,
  };
};

export const generateSystemName = (i: number) => {
  const prefixes = [
    "Alpha",
    "Beta",
    "Gamma",
    "Delta",
    "Epsilon",
    "Zeta",
    "Eta",
    "Theta",
    "Omicron",
    "Sigma",
  ];
  const suffixes = [
    "Majoris",
    "Minoris",
    "Prime",
    "Centauri",
    "Cygni",
    "Lyrae",
    "Eridani",
    "V",
    "X",
    "B",
  ];
  return `${prefixes[i % prefixes.length]} ${
    suffixes[Math.floor(Math.random() * suffixes.length)]
  } ${Math.floor(Math.random() * 999)}`;
};

// Generates systems for a specific spatial sector
export const generateSystemsForSector = (
  sectorX: number,
  sectorY: number,
  earthPos: Coordinates
): SolarSystem[] => {
  // Density: 0 to 3 systems per sector. Random integer from 0-3. Average is 1.5.
  const count = Math.floor(Math.random() * 4);
  const newSystems: SolarSystem[] = [];
  const maxDist = 5000; // Reference distance for scaling

  for (let i = 0; i < count; i++) {
    const position = generateCoordinatesInSector(sectorX, sectorY);

    // Calculate distance from Earth (Center) to determine resource richness
    const distFromEarth = Math.sqrt(
      Math.pow(position.x - earthPos.x, 2) +
        Math.pow(position.y - earthPos.y, 2)
    );
    const distFactor = Math.min(distFromEarth / maxDist, 2.0); // Cap at 2x

    const getAbundance = () => {
      const base = 10 + 50 * distFactor;
      const variance = Math.random() * 30 - 15;
      return Math.floor(Math.max(5, Math.min(100, base + variance)));
    };

    const getYield = (multiplier: number) => {
      const base = 1000 + 9000 * distFactor;
      const variance = 0.8 + Math.random() * 0.4;
      return Math.floor(base * variance * multiplier);
    };

    // Seed finite science based on distance (further = more)
    const science = Math.max(
      0,
      Math.floor(
        SCIENCE_BASE_PER_SYSTEM + distFromEarth * SCIENCE_DISTANCE_FACTOR
      )
    );

    newSystems.push({
      id: `sys-${sectorX}-${sectorY}-${i}-${Date.now()}`,
      name: generateSystemName(Math.floor(Math.random() * 1000)),
      position,
      visited: false,
      analyzed: false,
      discovered: false,
      resources: {
        [ResourceType.Metal]: getAbundance(),
        [ResourceType.Plutonium]: getAbundance(),
      },
      resourceYield: {
        [ResourceType.Metal]: getYield(1),
        [ResourceType.Plutonium]: getYield(0.5),
      },
      scienceRemaining: science,
      scienceTotal: science,
    });
  }
  return newSystems;
};

export const createInitialState = (): GameState => {
  const earthPos = { x: UNIVERSE_WIDTH / 2, y: UNIVERSE_HEIGHT / 2 };
  const earth: SolarSystem = {
    id: "sys-earth",
    name: "Earth",
    position: earthPos,
    visited: true,
    analyzed: true,
    discovered: true,
    lore: "The cradle of humanity. Depleted of easy resources, but the launchpad for the future.",
    resources: { [ResourceType.Metal]: 10, [ResourceType.Plutonium]: 10 },
    resourceYield: {
      [ResourceType.Metal]: 1000,
      [ResourceType.Plutonium]: 500,
    },
    scienceRemaining: 300,
    scienceTotal: 300,
  };

  // Determine which sector Earth is in
  const startSectorX = Math.floor(earthPos.x / SECTOR_SIZE);
  const startSectorY = Math.floor(earthPos.y / SECTOR_SIZE);

  // Initialize set with Earth's sector
  const generatedSectors = new Set<string>();
  generatedSectors.add(`${startSectorX},${startSectorY}`);

  // Generate initial systems in Earth's sector + neighbors to ensure some visibility
  // We manually add 2 guaranteed systems near Earth for the tutorial feel
  let systems: SolarSystem[] = [earth];

  // Add 2 guaranteed neighbors nearby
  const n1Pos = { x: earthPos.x + 300, y: earthPos.y - 150 };
  systems.push({
    id: "sys-neighbor-1",
    name: "Proxima Centauri",
    position: n1Pos,
    visited: false,
    analyzed: false,
    discovered: true,
    resources: { [ResourceType.Metal]: 30, [ResourceType.Plutonium]: 20 },
    resourceYield: {
      [ResourceType.Metal]: 2000,
      [ResourceType.Plutonium]: 800,
    },
    scienceRemaining: 250,
    scienceTotal: 250,
  });

  const n2Pos = { x: earthPos.x - 200, y: earthPos.y + 350 };
  systems.push({
    id: "sys-neighbor-2",
    name: "Wolf 359",
    position: n2Pos,
    visited: false,
    analyzed: false,
    discovered: true,
    resources: { [ResourceType.Metal]: 40, [ResourceType.Plutonium]: 15 },
    resourceYield: {
      [ResourceType.Metal]: 1500,
      [ResourceType.Plutonium]: 1000,
    },
    scienceRemaining: 220,
    scienceTotal: 220,
  });

  const initialProbe: Probe = {
    id: "probe-0",
    name: "Genesis-1",
    model: ProbeModel.MarkI,
    state: ProbeState.Idle,
    locationId: "sys-earth",
    originSystemId: "sys-earth",
    lastScannedSystemId: "sys-earth", // Assume earth is scanned
    position: { ...earth.position },
    targetSystemId: null,
    inventory: { [ResourceType.Metal]: 100, [ResourceType.Plutonium]: 100 },
    stats: PROBE_STATS[ProbeModel.MarkI],
    progress: 0,
    miningBuffer: 0,
    researchBuffer: 0,
    isAutonomyEnabled: true, // Default to true for consistency, though it starts with level 0
    lastDiversionCheck: Date.now(),
  };

  return {
    systems,
    probes: [initialProbe],
    blueprints: DEFAULT_BLUEPRINTS,
    generatedSectors,
    isDesignerOpen: false,
    editingBlueprint: undefined,
    selectedProbeId: initialProbe.id,
    selectedSystemId: earth.id,
    logs: ["Mission Control initialized.", "Genesis-1 ready for orders."],
    science: 0,
  };
};

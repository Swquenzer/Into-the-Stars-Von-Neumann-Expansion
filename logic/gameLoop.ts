import {
  Probe,
  SolarSystem,
  ProbeState,
  ResourceType,
  Coordinates,
} from "../types";
import {
  FUEL_CONSUMPTION_RATE,
  SOLAR_SAIL_SPEED_MULTIPLIER,
  TURN_COST_PER_DEGREE,
  PASSIVE_SCAN_RANGE,
  RESEARCH_RATE_BASE,
} from "../constants";
import {
  checkSectorGeneration,
  performPassiveScan,
} from "../logic/sectorGeneration";

export interface StateUpdateResult {
  probe: Probe;
  logMessages: string[];
  systemUpdates: { index: number; updates: Partial<SolarSystem> }[];
  newProbes: Probe[];
  scienceDelta?: number;
}

/**
 * Process a probe in the Traveling state
 */
export const processTravelingProbe = (
  probe: Probe,
  systems: SolarSystem[],
  delta: number
): StateUpdateResult => {
  const logMessages: string[] = [];
  const systemUpdates: { index: number; updates: Partial<SolarSystem> }[] = [];
  const updatedProbe = { ...probe };

  const startSys = systems.find((s) => s.id === probe.locationId);
  const targetSys = systems.find((s) => s.id === probe.targetSystemId);

  if (!startSys || !targetSys) {
    return { probe: updatedProbe, logMessages, systemUpdates, newProbes: [] };
  }

  const totalDist = Math.hypot(
    targetSys.position.x - startSys.position.x,
    targetSys.position.y - startSys.position.y
  );

  let speedMultiplier = 1;
  if (updatedProbe.isSolarSailing) {
    speedMultiplier = SOLAR_SAIL_SPEED_MULTIPLIER;
  }

  const unitsPerSecond = 10 * updatedProbe.stats.flightSpeed * speedMultiplier;
  const unitsTraveled = unitsPerSecond * (delta / 1000);
  let newProgress = updatedProbe.progress + unitsTraveled / totalDist;

  // Calculate current world position
  const currentPos: Coordinates = {
    x:
      startSys.position.x +
      (targetSys.position.x - startSys.position.x) * newProgress,
    y:
      startSys.position.y +
      (targetSys.position.y - startSys.position.y) * newProgress,
  };

  // Passive scan
  const scanResults = performPassiveScan(currentPos, systems);
  systemUpdates.push(...scanResults.systemUpdates);
  logMessages.push(
    ...scanResults.logMessages.map((msg) =>
      msg.replace("{probeName}", updatedProbe.name)
    )
  );

  if (newProgress >= 1) {
    updatedProbe.state = ProbeState.Idle;
    updatedProbe.locationId = targetSys.id;
    updatedProbe.position = { ...targetSys.position };
    updatedProbe.progress = 0;
    updatedProbe.isSolarSailing = false;
    logMessages.push(`${updatedProbe.name} arrived at ${targetSys.name}.`);

    const sysIndex = systems.findIndex((s) => s.id === targetSys.id);
    if (
      sysIndex > -1 &&
      (!systems[sysIndex].visited || !systems[sysIndex].discovered)
    ) {
      systemUpdates.push({
        index: sysIndex,
        updates: { visited: true, discovered: true },
      });
    }
  } else {
    updatedProbe.progress = newProgress;
    updatedProbe.position = currentPos;
  }

  return { probe: updatedProbe, logMessages, systemUpdates, newProbes: [] };
};

/**
 * Process a probe in the Researching state
 */
export const processResearchingProbe = (
  probe: Probe,
  systems: SolarSystem[],
  delta: number
): StateUpdateResult => {
  const logMessages: string[] = [];
  const systemUpdates: { index: number; updates: Partial<SolarSystem> }[] = [];
  const updatedProbe = { ...probe };

  const sysIndex = systems.findIndex((s) => s.id === probe.locationId);
  if (sysIndex === -1) {
    updatedProbe.state = ProbeState.Idle;
    updatedProbe.progress = 0;
    return { probe: updatedProbe, logMessages, systemUpdates, newProbes: [] };
  }

  const system = systems[sysIndex];
  const remaining = system.scienceRemaining ?? 0;
  if (remaining <= 0) {
    updatedProbe.state = ProbeState.Idle;
    updatedProbe.progress = 0;
    logMessages.push(
      `${updatedProbe.name} halted. Science exhausted in ${system.name}.`
    );
    return { probe: updatedProbe, logMessages, systemUpdates, newProbes: [] };
  }

  const ratePerSecond =
    RESEARCH_RATE_BASE * Math.max(0.1, updatedProbe.stats.scanSpeed);
  const amount = ratePerSecond * (delta / 1000);

  const toCollect = Math.min(amount, remaining);
  const newRemaining = Math.max(0, remaining - toCollect);

  const progressTotal =
    system.scienceTotal && system.scienceTotal > 0
      ? system.scienceTotal
      : remaining;
  const collectedSoFar = progressTotal - newRemaining;
  updatedProbe.progress = Math.min(100, (collectedSoFar / progressTotal) * 100);

  systemUpdates.push({
    index: sysIndex,
    updates: { scienceRemaining: newRemaining },
  });

  if (newRemaining <= 0) {
    updatedProbe.state = ProbeState.Idle;
    updatedProbe.progress = 0;
    logMessages.push(
      `${updatedProbe.name} completed research at ${system.name}.`
    );
  }

  return {
    probe: updatedProbe,
    logMessages,
    systemUpdates,
    newProbes: [],
    scienceDelta: toCollect,
  };
};

/**
 * Process a probe in the Exploring state
 */
export const processExploringProbe = (
  probe: Probe,
  systems: SolarSystem[],
  generatedSectors: Set<string>,
  earthPos: Coordinates,
  delta: number,
  now: number
): StateUpdateResult & {
  sectorGenerated: boolean;
  newSystems: SolarSystem[];
} => {
  const logMessages: string[] = [];
  const systemUpdates: { index: number; updates: Partial<SolarSystem> }[] = [];
  const updatedProbe = { ...probe };
  let sectorGenerated = false;
  let newSystems: SolarSystem[] = [];

  if (updatedProbe.heading === undefined) {
    return {
      probe: updatedProbe,
      logMessages,
      systemUpdates,
      newProbes: [],
      sectorGenerated,
      newSystems,
    };
  }

  const rad = (updatedProbe.heading * Math.PI) / 180;
  let speed = 10 * updatedProbe.stats.flightSpeed;

  const hasFuel = updatedProbe.inventory.Plutonium > 0;
  if (!hasFuel) {
    speed *= SOLAR_SAIL_SPEED_MULTIPLIER;
  }

  const moveDist = speed * (delta / 1000);
  const dx = Math.cos(rad) * moveDist;
  const dy = Math.sin(rad) * moveDist;

  updatedProbe.position = {
    x: updatedProbe.position.x + dx,
    y: updatedProbe.position.y + dy,
  };

  // Continuous fuel burn
  if (hasFuel) {
    const distTraveled = Math.sqrt(dx * dx + dy * dy);
    const fuelCost = distTraveled * FUEL_CONSUMPTION_RATE;
    updatedProbe.inventory.Plutonium = Math.max(
      0,
      updatedProbe.inventory.Plutonium - fuelCost
    );
  }

  // Check sector generation
  const sectorResult = checkSectorGeneration(
    updatedProbe.position,
    generatedSectors,
    earthPos,
    systems.length
  );
  if (sectorResult.generated) {
    sectorGenerated = true;
    newSystems = sectorResult.newSystems;
  }

  // Auto-dock check
  let docked = false;
  for (let i = 0; i < systems.length; i++) {
    const sys = systems[i];
    const dist = Math.hypot(
      sys.position.x - updatedProbe.position.x,
      sys.position.y - updatedProbe.position.y
    );

    if (dist <= 5) {
      updatedProbe.state = ProbeState.Idle;
      updatedProbe.locationId = sys.id;
      updatedProbe.position = { ...sys.position };
      updatedProbe.heading = undefined;

      logMessages.push(
        `${updatedProbe.name} entered gravity well of ${sys.name}. Docking initiated.`
      );

      if (!sys.visited || !sys.discovered) {
        systemUpdates.push({
          index: i,
          updates: { visited: true, discovered: true },
        });
      }
      docked = true;
      break;
    }
  }

  if (!docked) {
    // Passive scan (use combined systems array if new ones were generated)
    const allSystems = sectorGenerated ? [...systems, ...newSystems] : systems;
    const scanResults = performPassiveScan(updatedProbe.position, allSystems);
    systemUpdates.push(...scanResults.systemUpdates);
    logMessages.push(
      ...scanResults.logMessages.map((msg) =>
        msg.replace("{probeName}", updatedProbe.name)
      )
    );

    // Auto-divert for autonomous probes
    if (
      updatedProbe.stats.autonomyLevel > 0 &&
      updatedProbe.isAutonomyEnabled &&
      (!updatedProbe.lastDiversionCheck ||
        now - updatedProbe.lastDiversionCheck > 1000)
    ) {
      updatedProbe.lastDiversionCheck = now;
      const range = updatedProbe.stats.scanRange;
      const candidates = allSystems.filter(
        (s) => s.discovered && (!s.visited || !s.analyzed)
      );

      let nearestUnexplored: SolarSystem | null = null;
      let minUnexploredDist = range;

      candidates.forEach((s) => {
        const d = Math.hypot(
          s.position.x - updatedProbe.position.x,
          s.position.y - updatedProbe.position.y
        );
        if (d < minUnexploredDist) {
          minUnexploredDist = d;
          nearestUnexplored = s;
        }
      });

      if (nearestUnexplored) {
        const tSys = nearestUnexplored;
        const tx = tSys.position.x - updatedProbe.position.x;
        const ty = tSys.position.y - updatedProbe.position.y;
        let targetHeading = (Math.atan2(ty, tx) * 180) / Math.PI;
        if (targetHeading < 0) targetHeading += 360;

        let diff = Math.abs(targetHeading - (updatedProbe.heading || 0));
        if (diff > 180) diff = 360 - diff;
        const turnCost = diff * TURN_COST_PER_DEGREE;

        updatedProbe.heading = targetHeading;
        if (updatedProbe.inventory.Plutonium >= turnCost) {
          updatedProbe.inventory.Plutonium -= turnCost;
        } else {
          updatedProbe.inventory.Plutonium = 0;
          updatedProbe.isSolarSailing = true;
        }
        logMessages.push(
          `${updatedProbe.name} (AI) auto-diverting to ${tSys.name}.`
        );
      }
    }

    // Safety protocol check
    if (
      hasFuel &&
      (!updatedProbe.lastSafetyCheck ||
        now - updatedProbe.lastSafetyCheck > 1000)
    ) {
      updatedProbe.lastSafetyCheck = now;

      const safeSystems = allSystems.filter((s) => s.discovered);
      let nearest: SolarSystem | null = null;
      let minDist = Infinity;

      safeSystems.forEach((s) => {
        const d = Math.hypot(
          s.position.x - updatedProbe.position.x,
          s.position.y - updatedProbe.position.y
        );
        if (d < minDist) {
          minDist = d;
          nearest = s;
        }
      });

      if (nearest) {
        const travelReturnCost = minDist * FUEL_CONSUMPTION_RATE;

        const dx = nearest.position.x - updatedProbe.position.x;
        const dy = nearest.position.y - updatedProbe.position.y;
        let targetHeading = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (targetHeading < 0) targetHeading += 360;

        let diff = Math.abs(targetHeading - (updatedProbe.heading || 0));
        if (diff > 180) diff = 360 - diff;
        const turnReturnCost = diff * TURN_COST_PER_DEGREE;

        const totalReturnCost = travelReturnCost + turnReturnCost;
        const safetyMargin = 1.2;

        if (updatedProbe.inventory.Plutonium < totalReturnCost * safetyMargin) {
          updatedProbe.heading = targetHeading;
          updatedProbe.inventory.Plutonium = Math.max(
            0,
            updatedProbe.inventory.Plutonium - turnReturnCost
          );
          logMessages.push(
            `CRITICAL FUEL: ${updatedProbe.name} auto-adjusting course for ${nearest.name}.`
          );
        }
      }
    }
  }

  return {
    probe: updatedProbe,
    logMessages,
    systemUpdates,
    newProbes: [],
    sectorGenerated,
    newSystems,
  };
};

/**
 * Process a probe in the Mining state
 */
export const processMiningProbe = (
  probe: Probe,
  systems: SolarSystem[],
  delta: number
): StateUpdateResult & {
  systemYieldUpdate?: {
    index: number;
    resourceType: ResourceType;
    newYield: number;
  };
} => {
  const logMessages: string[] = [];
  const systemUpdates: { index: number; updates: Partial<SolarSystem> }[] = [];
  const updatedProbe = { ...probe };
  let systemYieldUpdate:
    | { index: number; resourceType: ResourceType; newYield: number }
    | undefined;

  const sysIndex = systems.findIndex((s) => s.id === probe.locationId);
  if (sysIndex === -1) {
    return { probe: updatedProbe, logMessages, systemUpdates, newProbes: [] };
  }

  const system = systems[sysIndex];
  const resourceType =
    updatedProbe.state === ProbeState.MiningMetal
      ? ResourceType.Metal
      : ResourceType.Plutonium;

  if (system.resourceYield[resourceType] > 0) {
    const abundanceFactor = system.resources[resourceType] / 100;
    const speedMultiplier = updatedProbe.stats.miningSpeed;
    const baseRate = 2.0;
    const ratePerSecond = baseRate * abundanceFactor * speedMultiplier;
    const amountToAdd = ratePerSecond * (delta / 1000);
    updatedProbe.miningBuffer += amountToAdd;

    if (updatedProbe.miningBuffer >= 1) {
      const transferAmount = Math.floor(updatedProbe.miningBuffer);
      const actualTransfer = Math.min(
        transferAmount,
        system.resourceYield[resourceType]
      );
      updatedProbe.inventory[resourceType] += actualTransfer;
      updatedProbe.miningBuffer -= transferAmount;

      systemYieldUpdate = {
        index: sysIndex,
        resourceType,
        newYield: system.resourceYield[resourceType] - actualTransfer,
      };
    }
    updatedProbe.progress = Math.min(updatedProbe.miningBuffer * 100, 100);
  } else {
    updatedProbe.state = ProbeState.Idle;
    updatedProbe.progress = 0;
    updatedProbe.miningBuffer = 0;
    logMessages.push(`${updatedProbe.name} halted. ${resourceType} depleted.`);
  }

  return {
    probe: updatedProbe,
    logMessages,
    systemUpdates,
    newProbes: [],
    systemYieldUpdate,
  };
};

/**
 * Process a probe in the Replicating state
 */
export const processReplicatingProbe = (
  probe: Probe,
  delta: number,
  colonizedSystemIds: Set<string>
): StateUpdateResult => {
  const logMessages: string[] = [];
  const systemUpdates: { index: number; updates: Partial<SolarSystem> }[] = [];
  const updatedProbe = { ...probe };
  const newProbes: Probe[] = [];

  const pendingBlueprint = updatedProbe.pendingBlueprint;
  if (!pendingBlueprint) {
    updatedProbe.state = ProbeState.Idle;
    return { probe: updatedProbe, logMessages, systemUpdates, newProbes };
  }

  const baseTime = pendingBlueprint.cost.time;
  const speed = Math.max(0.1, updatedProbe.stats.replicationSpeed);
  const effectiveTime = baseTime / speed;
  updatedProbe.progress += (delta / effectiveTime) * 100;

  if (updatedProbe.progress >= 100) {
    updatedProbe.state = ProbeState.Idle;
    updatedProbe.progress = 0;
    const newId = `probe-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newProbe: Probe = {
      id: newId,
      name: pendingBlueprint.isCustom
        ? `${pendingBlueprint.name}-${Math.floor(Math.random() * 100)}`
        : "Constructing...",
      model: pendingBlueprint.name,
      state: ProbeState.Idle,
      locationId: updatedProbe.locationId,
      originSystemId: updatedProbe.locationId,
      lastScannedSystemId: updatedProbe.locationId,
      position: { ...updatedProbe.position },
      targetSystemId: null,
      inventory: pendingBlueprint.initialInventory
        ? { ...pendingBlueprint.initialInventory }
        : { Metal: 0, Plutonium: 0 },
      stats: pendingBlueprint.stats,
      progress: 0,
      miningBuffer: 0,
      isSolarSailing: false,
      isAutonomyEnabled: true,
      lastDiversionCheck: Date.now(),
    };

    newProbes.push(newProbe);
    if (updatedProbe.locationId) {
      colonizedSystemIds.add(updatedProbe.locationId);
    }

    logMessages.push(
      `${updatedProbe.name} finished building ${pendingBlueprint.name}.`
    );
    delete updatedProbe.pendingBlueprint;

    // If not custom, we'll need to generate a name asynchronously (handled in App.tsx)
  }

  return { probe: updatedProbe, logMessages, systemUpdates, newProbes };
};

/**
 * Process a probe in the Scanning state
 */
export const processScanningProbe = (
  probe: Probe,
  systems: SolarSystem[],
  generatedSectors: Set<string>,
  earthPos: Coordinates,
  delta: number
): StateUpdateResult & {
  sectorGenerated: boolean;
  newSystems: SolarSystem[];
} => {
  const logMessages: string[] = [];
  const systemUpdates: { index: number; updates: Partial<SolarSystem> }[] = [];
  const updatedProbe = { ...probe };
  let sectorGenerated = false;
  let newSystems: SolarSystem[] = [];

  const scanSpeed = updatedProbe.stats.scanSpeed * (delta / 30);
  updatedProbe.progress += scanSpeed;

  if (updatedProbe.progress >= 100) {
    updatedProbe.state = ProbeState.Idle;
    updatedProbe.progress = 0;

    if (updatedProbe.locationId) {
      updatedProbe.lastScannedSystemId = updatedProbe.locationId;
    }

    let foundCount = 0;
    const range = updatedProbe.stats.scanRange;

    // Check sector generation
    const sectorResult = checkSectorGeneration(
      updatedProbe.position,
      generatedSectors,
      earthPos,
      systems.length
    );
    if (sectorResult.generated) {
      sectorGenerated = true;
      newSystems = sectorResult.newSystems;
      logMessages.push(`Uncharted sector mapped by ${updatedProbe.name}.`);
    }

    // Scan for systems (use combined array if new systems generated)
    const allSystems = sectorGenerated ? [...systems, ...newSystems] : systems;
    allSystems.forEach((sys, idx) => {
      if (!sys.discovered) {
        const dist = Math.hypot(
          sys.position.x - updatedProbe.position.x,
          sys.position.y - updatedProbe.position.y
        );
        if (dist <= range) {
          // Only add update if it's in the original systems array
          if (idx < systems.length) {
            systemUpdates.push({
              index: idx,
              updates: { discovered: true },
            });
          } else {
            // It's a new system, mark it directly
            newSystems[idx - systems.length].discovered = true;
          }
          foundCount++;
        }
      }
    });

    if (foundCount > 0) {
      logMessages.push(
        `${updatedProbe.name} scan complete. ${foundCount} new system(s) found.`
      );
    } else {
      logMessages.push(
        `${updatedProbe.name} scan complete. No new signals detected.`
      );
    }
  }

  return {
    probe: updatedProbe,
    logMessages,
    systemUpdates,
    newProbes: [],
    sectorGenerated,
    newSystems,
  };
};

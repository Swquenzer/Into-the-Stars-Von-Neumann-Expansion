/**
 * Focus Replication: Replicate as long as resources allow, then move to nearest system with enough resources.
 * Checks post-replication Plutonium for travel. Respects cooldown.
 */
export const processFocusReplication = (
  probe: Probe,
  systems: SolarSystem[],
  currentSystem: SolarSystem | undefined,
  lastReplicationTime: number | undefined,
  now: number
): BehaviorDecision | null => {
  // Replication cost (match blueprint or use defaults)
  const REPLICATION_METAL = 500;
  const REPLICATION_PLUTONIUM = 300;
  const REPLICATION_COOLDOWN = 20000; // 20s cooldown

  // Find nearest system with enough resources
  const candidates = systems.filter(
    (s) =>
      s.discovered &&
      s.id !== probe.locationId &&
      s.resourceYield.Metal >= REPLICATION_METAL &&
      s.resourceYield.Plutonium >= REPLICATION_PLUTONIUM
  );

  // Helper: distance to system
  const getDist = (sys: SolarSystem) =>
    Math.hypot(
      sys.position.x - probe.position.x,
      sys.position.y - probe.position.y
    );

  // Check cooldown
  if (lastReplicationTime && now - lastReplicationTime < REPLICATION_COOLDOWN) {
    return {
      action: "idle",
      reason: `Focus Replication: waiting for cooldown (${Math.ceil(
        (REPLICATION_COOLDOWN - (now - lastReplicationTime)) / 1000
      )}s)`,
    };
  }

  // Can replicate here?
  if (
    currentSystem &&
    probe.inventory.Metal >= REPLICATION_METAL &&
    probe.inventory.Plutonium >= REPLICATION_PLUTONIUM
  ) {
    // After replication, will we have enough Plutonium to reach next system?
    let minDist = Infinity;
    let nearest: SolarSystem | null = null;
    candidates.forEach((s) => {
      const d = getDist(s);
      if (d < minDist) {
        minDist = d;
        nearest = s;
      }
    });
    const postRepPlutonium = probe.inventory.Plutonium - REPLICATION_PLUTONIUM;
    const fuelNeeded = nearest
      ? Math.floor(minDist * FUEL_CONSUMPTION_RATE)
      : 0;
    if (nearest && postRepPlutonium < fuelNeeded) {
      // Not enough fuel after replication, mine Plutonium first
      if (currentSystem.resourceYield.Plutonium > 0) {
        return {
          action: "mine_plutonium",
          reason:
            "Focus Replication: mining Plutonium to ensure post-replication travel",
        };
      }
    }
    // Replicate!
    return {
      action: "replicate",
      reason: "Focus Replication: replicating at current system",
      replicationThresholds: {
        metal: REPLICATION_METAL,
        plutonium: REPLICATION_PLUTONIUM,
        time: 10000, // 10 seconds base replication time
      },
    };
  }

  // Not enough resources, mine locally if possible
  if (currentSystem) {
    if (
      probe.inventory.Metal < REPLICATION_METAL &&
      currentSystem.resourceYield.Metal > 0
    ) {
      return {
        action: "mine_metal",
        reason: "Focus Replication: mining Metal for replication",
      };
    }
    if (
      probe.inventory.Plutonium < REPLICATION_PLUTONIUM &&
      currentSystem.resourceYield.Plutonium > 0
    ) {
      return {
        action: "mine_plutonium",
        reason: "Focus Replication: mining Plutonium for replication",
      };
    }
  }

  // Move to nearest system with enough resources
  if (candidates.length > 0) {
    let minDist = Infinity;
    let nearest: SolarSystem | null = null;
    candidates.forEach((s) => {
      const d = getDist(s);
      if (d < minDist) {
        minDist = d;
        nearest = s;
      }
    });
    if (nearest) {
      const fuelNeeded = Math.floor(minDist * FUEL_CONSUMPTION_RATE);
      if (probe.inventory.Plutonium >= fuelNeeded) {
        return {
          action: "travel",
          targetSystemId: nearest.id,
          reason: `Focus Replication: traveling to ${nearest.name} for resources`,
        };
      } else if (currentSystem && currentSystem.resourceYield.Plutonium > 0) {
        return {
          action: "mine_plutonium",
          reason: "Focus Replication: refueling for travel to resource system",
        };
      }
    }
  }

  // Fallback: idle
  return {
    action: "idle",
    reason: "Focus Replication: no viable replication or travel targets",
  };
};
import {
  Probe,
  SolarSystem,
  ProbeState,
  ResourceType,
  AIBehavior,
  Coordinates,
} from "../types";
import { FUEL_CONSUMPTION_RATE } from "../constants";

export interface BehaviorDecision {
  action:
    | "mine_metal"
    | "mine_plutonium"
    | "travel"
    | "scan"
    | "research"
    | "deploy_relay"
    | "replicate"
    | "idle";
  targetSystemId?: string;
  reason: string;
  replicationThresholds?: { metal: number; plutonium: number; time: number };
  newProbeInstructions?: any;
}

/**
 * Default behavior: Alternate between mining Metal and Plutonium every 10 units
 */
export const processDefaultBehavior = (
  probe: Probe,
  currentSystem: SolarSystem | undefined,
  previousState?: ProbeState
): BehaviorDecision | null => {
  if (!currentSystem) return null;

  // Initialize batch progress if needed
  const batchProgress = probe.miningBatchProgress ?? 0;
  // Use previousState if provided (for when probe was interrupted), otherwise use current state
  const stateToCheck = previousState ?? probe.state;
  const currentlyMiningMetal = stateToCheck === ProbeState.MiningMetal;
  const currentlyMiningPlutonium = stateToCheck === ProbeState.MiningPlutonium;

  // If we've completed a batch of 10 (or starting fresh), switch resources
  const shouldSwitch = batchProgress >= 10 || stateToCheck === ProbeState.Idle;

  // Determine which resource to mine
  let targetResource: "metal" | "plutonium";
  
  if (shouldSwitch) {
    // Switch to the opposite of what we were mining
    if (currentlyMiningMetal) {
      targetResource = "plutonium";
    } else {
      // Default to metal if starting fresh or was mining plutonium
      targetResource = "metal";
    }
  } else {
    // Continue with current resource
    targetResource = currentlyMiningMetal ? "metal" : "plutonium";
  }

  // Try to mine the target resource
  if (targetResource === "metal" && currentSystem.resourceYield.Metal > 0) {
    return {
      action: "mine_metal",
      reason: shouldSwitch 
        ? `Default behavior: switching to Metal (batch complete)`
        : `Default behavior: mining Metal (${batchProgress}/10)`,
    };
  } else if (targetResource === "plutonium" && currentSystem.resourceYield.Plutonium > 0) {
    return {
      action: "mine_plutonium",
      reason: shouldSwitch
        ? `Default behavior: switching to Plutonium (batch complete)`
        : `Default behavior: mining Plutonium (${batchProgress}/10)`,
    };
  }

  // Fallback to other resource if target is depleted
  if (currentSystem.resourceYield.Metal > 0) {
    return {
      action: "mine_metal",
      reason: "Default behavior: mining Metal (fallback)",
    };
  } else if (currentSystem.resourceYield.Plutonium > 0) {
    return {
      action: "mine_plutonium",
      reason: "Default behavior: mining Plutonium (fallback)",
    };
  }

  return { action: "idle", reason: "Default behavior: all resources depleted" };
};

/**
 * Focus Mining: Extract resources until depleted, then find next rich system
 */
export const processFocusMining = (
  probe: Probe,
  systems: SolarSystem[],
  currentSystem: SolarSystem | undefined
): BehaviorDecision | null => {
  // If at a system, mine until depleted
  if (currentSystem) {
    const metalRemaining = currentSystem.resourceYield.Metal;
    const plutoniumRemaining = currentSystem.resourceYield.Plutonium;

    // Prioritize Metal, then Plutonium
    if (metalRemaining > 0) {
      return { action: "mine_metal", reason: "Focus Mining: extracting Metal" };
    } else if (plutoniumRemaining > 0) {
      return {
        action: "mine_plutonium",
        reason: "Focus Mining: extracting Plutonium",
      };
    }

    // Current system depleted, find next target
  }

  // Find nearest resource-rich system
  const candidates = systems.filter(
    (s) =>
      s.discovered &&
      s.id !== probe.locationId &&
      (s.resourceYield.Metal > 100 || s.resourceYield.Plutonium > 50)
  );

  if (candidates.length === 0) {
    // Fallback to default behavior
    return currentSystem ? processDefaultBehavior(probe, currentSystem) : null;
  }

  // Find nearest
  let nearest: SolarSystem | null = null;
  let minDist = Infinity;

  candidates.forEach((s) => {
    const d = Math.hypot(
      s.position.x - probe.position.x,
      s.position.y - probe.position.y
    );
    if (d < minDist) {
      minDist = d;
      nearest = s;
    }
  });

  if (nearest) {
    const fuelNeeded = Math.floor(minDist * FUEL_CONSUMPTION_RATE);
    if (probe.inventory.Plutonium >= fuelNeeded) {
      return {
        action: "travel",
        targetSystemId: nearest.id,
        reason: `Focus Mining: traveling to ${nearest.name} (${Math.floor(
          minDist
        )} LY)`,
      };
    } else {
      // Need fuel, mine it first
      if (currentSystem && currentSystem.resourceYield.Plutonium > 0) {
        return {
          action: "mine_plutonium",
          reason: "Focus Mining: refueling for next target",
        };
      }
    }
  }

  return { action: "idle", reason: "Focus Mining: no viable targets" };
};

/**
 * Focus Exploring: Scan and discover new systems
 */
export const processFocusExploring = (
  probe: Probe,
  systems: SolarSystem[],
  currentSystem: SolarSystem | undefined
): BehaviorDecision | null => {
  // If just arrived, scan first
  if (currentSystem && probe.lastScannedSystemId !== currentSystem.id) {
    return { action: "scan", reason: "Focus Exploring: scanning new arrival" };
  }

  // Find unvisited discovered systems
  const unvisited = systems.filter(
    (s) => s.discovered && !s.visited && s.id !== probe.locationId
  );

  if (unvisited.length > 0) {
    // Find nearest unvisited
    let nearest: SolarSystem | null = null;
    let minDist = Infinity;

    unvisited.forEach((s) => {
      const d = Math.hypot(
        s.position.x - probe.position.x,
        s.position.y - probe.position.y
      );
      if (d < minDist) {
        minDist = d;
        nearest = s;
      }
    });

    if (nearest) {
      const fuelNeeded = Math.floor(minDist * FUEL_CONSUMPTION_RATE);
      if (probe.inventory.Plutonium >= fuelNeeded) {
        return {
          action: "travel",
          targetSystemId: nearest.id,
          reason: `Focus Exploring: visiting ${nearest.name}`,
        };
      } else {
        // Need fuel
        if (currentSystem && currentSystem.resourceYield.Plutonium > 0) {
          return {
            action: "mine_plutonium",
            reason: "Focus Exploring: refueling",
          };
        }
      }
    }
  }

  // No unvisited systems, scan for new ones
  return {
    action: "scan",
    reason: "Focus Exploring: scanning for new systems",
  };
};

/**
 * Focus Science: Collect science and deploy relays
 */
export const processFocusScience = (
  probe: Probe,
  systems: SolarSystem[],
  currentSystem: SolarSystem | undefined,
  hasRelayAtCurrentSystem: boolean,
  hasRelayUnlock: boolean
): BehaviorDecision | null => {
  // If at system with science, research
  if (
    currentSystem &&
    currentSystem.scienceRemaining &&
    currentSystem.scienceRemaining > 0
  ) {
    return {
      action: "research",
      reason: `Focus Science: extracting science from ${currentSystem.name}`,
    };
  }

  // If at system without relay and has unlock and enough metal, deploy
  if (
    currentSystem &&
    !hasRelayAtCurrentSystem &&
    hasRelayUnlock &&
    probe.inventory.Metal >= 400
  ) {
    return {
      action: "deploy_relay",
      reason: `Focus Science: deploying relay at ${currentSystem.name}`,
    };
  }

  // Find systems with remaining science
  const scienceSystems = systems.filter(
    (s) =>
      s.discovered &&
      s.id !== probe.locationId &&
      s.scienceRemaining &&
      s.scienceRemaining > 5 // Only target systems with meaningful science
  );

  if (scienceSystems.length > 0) {
    // Find nearest
    let nearest: SolarSystem | null = null;
    let minDist = Infinity;

    scienceSystems.forEach((s) => {
      const d = Math.hypot(
        s.position.x - probe.position.x,
        s.position.y - probe.position.y
      );
      if (d < minDist) {
        minDist = d;
        nearest = s;
      }
    });

    if (nearest) {
      const fuelNeeded = Math.floor(minDist * FUEL_CONSUMPTION_RATE);
      if (probe.inventory.Plutonium >= fuelNeeded) {
        return {
          action: "travel",
          targetSystemId: nearest.id,
          reason: `Focus Science: traveling to ${nearest.name} (${nearest.scienceRemaining} sci remaining)`,
        };
      } else {
        // Need fuel
        if (currentSystem && currentSystem.resourceYield.Plutonium > 0) {
          return {
            action: "mine_plutonium",
            reason: "Focus Science: refueling",
          };
        }
      }
    }
  }

  // Fallback to default mining behavior
  return currentSystem ? processDefaultBehavior(probe, currentSystem) : null;
};

/**
 * Main behavior processor - routes to appropriate behavior handler
 */
export const processBehaviorMode = (
  probe: Probe,
  systems: SolarSystem[],
  relays: Array<{ systemId: string }>,
  hasRelayUnlock: boolean,
  lastReplicationTime?: number,
  now?: number,
  previousState?: ProbeState
): BehaviorDecision | null => {
  const currentSystem = systems.find((s) => s.id === probe.locationId);
  const hasRelayAtCurrentSystem = currentSystem
    ? relays.some((r) => r.systemId === currentSystem.id)
    : false;

  // Check if probe has a selected behavior
  const behavior = probe.aiBehavior;

  switch (behavior) {
    case AIBehavior.FocusMining:
      return processFocusMining(probe, systems, currentSystem);
    case AIBehavior.FocusExploring:
      return processFocusExploring(probe, systems, currentSystem);
    case AIBehavior.FocusScience:
      return processFocusScience(
        probe,
        systems,
        currentSystem,
        hasRelayAtCurrentSystem,
        hasRelayUnlock
      );
    case AIBehavior.FocusReplication:
      return processFocusReplication(
        probe,
        systems,
        currentSystem,
        lastReplicationTime,
        now ?? Date.now()
      );
    default:
      // No specific behavior or AIBehavior.None - use default
      return processDefaultBehavior(probe, currentSystem, previousState);
  }
};

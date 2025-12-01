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
    | "idle";
  targetSystemId?: string;
  reason: string;
}

/**
 * Default behavior: Alternate between mining Metal and Plutonium
 */
export const processDefaultBehavior = (
  probe: Probe,
  currentSystem: SolarSystem | undefined
): BehaviorDecision | null => {
  if (!currentSystem) return null;

  // Check what we mined last based on current state
  const lastMinedMetal = probe.state === ProbeState.MiningMetal;
  const lastMinedPlutonium = probe.state === ProbeState.MiningPlutonium;

  // Alternate: if last mined Metal (or starting fresh), mine Plutonium next
  if (lastMinedMetal || probe.state === ProbeState.Idle) {
    if (currentSystem.resourceYield.Plutonium > 0) {
      return {
        action: "mine_plutonium",
        reason: "Default behavior: alternating to Plutonium",
      };
    } else if (currentSystem.resourceYield.Metal > 0) {
      return {
        action: "mine_metal",
        reason: "Default behavior: Plutonium depleted, mining Metal",
      };
    }
  }

  // If last mined Plutonium, mine Metal next
  if (lastMinedPlutonium) {
    if (currentSystem.resourceYield.Metal > 0) {
      return {
        action: "mine_metal",
        reason: "Default behavior: alternating to Metal",
      };
    } else if (currentSystem.resourceYield.Plutonium > 0) {
      return {
        action: "mine_plutonium",
        reason: "Default behavior: Metal depleted, mining Plutonium",
      };
    }
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
  hasRelayUnlock: boolean
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

    default:
      // No specific behavior or AIBehavior.None - use default
      return processDefaultBehavior(probe, currentSystem);
  }
};

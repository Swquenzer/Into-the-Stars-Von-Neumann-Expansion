import { Probe, SolarSystem, ProbeState, ResourceType } from "../types";
import { FUEL_CONSUMPTION_RATE } from "../constants";

export interface AutonomyResult {
  probe: Probe;
  logMessage?: string;
  systemChanges?: { systemId: string; changes: Partial<SolarSystem> }[];
  shouldReplicate?: boolean;
  replicationThresholds?: { metal: number; plutonium: number; time: number };
}

/**
 * Manages autonomous probe decision-making based on AI level
 * Priority 1: Instant Analysis upon arrival
 * Priority 2: Scanning if not scanned here yet
 * Priority 3a (Level 2): Self-replication logic
 * Priority 3b: Navigation to unvisited systems or deep space exploration
 */
export const processAutonomousProbe = (
  probe: Probe,
  systems: SolarSystem[],
  colonizedSystemIds: Set<string>,
  now: number
): AutonomyResult => {
  // Only process if AI is enabled and probe is idle
  if (
    probe.stats.autonomyLevel === 0 ||
    !probe.isAutonomyEnabled ||
    probe.state !== ProbeState.Idle
  ) {
    return { probe };
  }

  let updatedProbe = { ...probe };
  const currentSystem = systems.find((s) => s.id === updatedProbe.locationId);
  const systemChanges: { systemId: string; changes: Partial<SolarSystem> }[] =
    [];

  // Priority 1: Instant Analysis upon arrival
  if (currentSystem && !currentSystem.analyzed) {
    systemChanges.push({
      systemId: currentSystem.id,
      changes: { analyzed: true },
    });
  }

  // Priority 2: Scanning (if we haven't scanned here yet)
  if (
    updatedProbe.locationId &&
    updatedProbe.lastScannedSystemId !== updatedProbe.locationId
  ) {
    updatedProbe.state = ProbeState.Scanning;
    updatedProbe.progress = 0;
    return {
      probe: updatedProbe,
      systemChanges,
      logMessage: `${updatedProbe.name} (AI) initializing sensor sweep of new system.`,
    };
  }

  // AI LOGIC START
  let actionTaken = false;

  // REPLICATOR LOGIC (Level 2 only)
  if (
    updatedProbe.stats.autonomyLevel === 2 &&
    updatedProbe.locationId &&
    updatedProbe.originSystemId &&
    updatedProbe.locationId !== updatedProbe.originSystemId
  ) {
    // Check if any probe has already replicated here
    const hasReplicatedHere = colonizedSystemIds.has(updatedProbe.locationId);

    if (!hasReplicatedHere) {
      const REPLICATION_THRESHOLD_M = 500;
      const REPLICATION_THRESHOLD_P = 300;
      const REPLICATION_TIME = 60000; // 60s

      if (
        updatedProbe.inventory.Metal >= REPLICATION_THRESHOLD_M &&
        updatedProbe.inventory.Plutonium >= REPLICATION_THRESHOLD_P
      ) {
        // Signal that replication should start
        return {
          probe: updatedProbe,
          systemChanges,
          shouldReplicate: true,
          replicationThresholds: {
            metal: REPLICATION_THRESHOLD_M,
            plutonium: REPLICATION_THRESHOLD_P,
            time: REPLICATION_TIME,
          },
          logMessage: `${updatedProbe.name} (AI) beginning self-replication.`,
        };
      } else if (
        currentSystem &&
        (updatedProbe.inventory.Metal < REPLICATION_THRESHOLD_M ||
          updatedProbe.inventory.Plutonium < REPLICATION_THRESHOLD_P)
      ) {
        // Need resources for replication
        if (
          updatedProbe.inventory.Plutonium < REPLICATION_THRESHOLD_P &&
          currentSystem.resourceYield.Plutonium > 0
        ) {
          updatedProbe.state = ProbeState.MiningPlutonium;
          updatedProbe.progress = 0;
          updatedProbe.miningBuffer = 0;
          return {
            probe: updatedProbe,
            systemChanges,
            logMessage: `${updatedProbe.name} (AI) mining Plutonium for replication.`,
          };
        } else if (
          updatedProbe.inventory.Metal < REPLICATION_THRESHOLD_M &&
          currentSystem.resourceYield.Metal > 0
        ) {
          updatedProbe.state = ProbeState.MiningMetal;
          updatedProbe.progress = 0;
          updatedProbe.miningBuffer = 0;
          return {
            probe: updatedProbe,
            systemChanges,
            logMessage: `${updatedProbe.name} (AI) mining Metal for replication.`,
          };
        }
      }
    }
  }

  // EXPLORATION LOGIC (Adventurer & Replicator)
  if (!actionTaken) {
    // Find nearest unvisited/unanalyzed system
    const candidates = systems.filter(
      (s) =>
        s.discovered &&
        (!s.visited || !s.analyzed) &&
        s.id !== updatedProbe.locationId
    );

    let target: SolarSystem | null = null;
    let minDist = Infinity;

    candidates.forEach((s) => {
      const d = Math.hypot(
        s.position.x - updatedProbe.position.x,
        s.position.y - updatedProbe.position.y
      );
      if (d < minDist) {
        minDist = d;
        target = s;
      }
    });

    if (target) {
      const dist = minDist;
      const fuelNeeded = Math.floor(dist * FUEL_CONSUMPTION_RATE);

      if (updatedProbe.inventory.Plutonium >= fuelNeeded) {
        // Launch to target
        updatedProbe.state = ProbeState.Traveling;
        updatedProbe.targetSystemId = target.id;
        updatedProbe.progress = 0;
        updatedProbe.inventory.Plutonium -= fuelNeeded;
        return {
          probe: updatedProbe,
          systemChanges,
          logMessage: `${updatedProbe.name} (AI) departing for ${target.name}.`,
        };
      } else {
        // Need fuel
        if (currentSystem && currentSystem.resourceYield.Plutonium > 0) {
          updatedProbe.state = ProbeState.MiningPlutonium;
          updatedProbe.progress = 0;
          updatedProbe.miningBuffer = 0;
          return {
            probe: updatedProbe,
            systemChanges,
            logMessage: `${updatedProbe.name} (AI) refueling for transit.`,
          };
        }
      }
    } else {
      // No known targets - deep space exploration
      const DEEP_SPACE_FUEL_REQ = 30;

      // Check if we need fuel for deep space
      if (
        updatedProbe.inventory.Plutonium < DEEP_SPACE_FUEL_REQ &&
        currentSystem &&
        currentSystem.resourceYield.Plutonium > 0
      ) {
        updatedProbe.state = ProbeState.MiningPlutonium;
        updatedProbe.progress = 0;
        updatedProbe.miningBuffer = 0;
        return {
          probe: updatedProbe,
          systemChanges,
          logMessage: `${updatedProbe.name} (AI) mining Plutonium for deep space expedition.`,
        };
      } else {
        // Launch into deep space
        const randomHeading = Math.floor(Math.random() * 360);
        updatedProbe.state = ProbeState.Exploring;
        updatedProbe.heading = randomHeading;
        updatedProbe.locationId = null;
        updatedProbe.targetSystemId = null;

        // Push out
        const rad = (randomHeading * Math.PI) / 180;
        updatedProbe.position = {
          x: updatedProbe.position.x + Math.cos(rad) * 10,
          y: updatedProbe.position.y + Math.sin(rad) * 10,
        };
        updatedProbe.lastSafetyCheck = now;
        updatedProbe.lastDiversionCheck = now;

        if (updatedProbe.inventory.Plutonium <= 0) {
          updatedProbe.isSolarSailing = true;
        }

        return {
          probe: updatedProbe,
          systemChanges,
          logMessage: `${updatedProbe.name} (AI) heading into deep space (Vector ${randomHeading}).`,
        };
      }
    }
  }

  return { probe: updatedProbe, systemChanges };
};

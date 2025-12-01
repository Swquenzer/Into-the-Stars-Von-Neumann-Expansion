import {
  Probe,
  SolarSystem,
  ProbeState,
  ResourceType,
  AIBehavior,
} from "../types";
import { FUEL_CONSUMPTION_RATE } from "../constants";
import { processBehaviorMode, BehaviorDecision } from "./aiBehaviorSystem";

export interface AutonomyResult {
  probe: Probe;
  logMessage?: string;
  systemChanges?: { systemId: string; changes: Partial<SolarSystem> }[];
  shouldReplicate?: boolean;
  replicationThresholds?: { metal: number; plutonium: number; time: number };
}

/**
 * Manages autonomous probe decision-making using AI behavior system
 * Priority 1: Instant Analysis upon arrival
 * Priority 2: Scanning if not scanned here yet
 * Priority 3: Execute selected AI behavior (or default mining)
 */
export const processAutonomousProbe = (
  probe: Probe,
  systems: SolarSystem[],
  colonizedSystemIds: Set<string>,
  now: number,
  relays: Array<{ systemId: string }> = [],
  hasRelayUnlock: boolean = false
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

  // Priority 3: Execute AI behavior
  const decision = processBehaviorMode(
    updatedProbe,
    systems,
    relays,
    hasRelayUnlock
  );

  if (!decision) {
    return { probe: updatedProbe, systemChanges };
  }

  // Add decision to log if tracking
  if (updatedProbe.aiDecisionLog) {
    updatedProbe.aiDecisionLog.push(decision.reason);
    // Keep only last 10 decisions
    if (updatedProbe.aiDecisionLog.length > 10) {
      updatedProbe.aiDecisionLog = updatedProbe.aiDecisionLog.slice(-10);
    }
  }

  // Execute decision
  switch (decision.action) {
    case "mine_metal":
      updatedProbe.state = ProbeState.MiningMetal;
      updatedProbe.progress = 0;
      updatedProbe.miningBuffer = 0;
      return {
        probe: updatedProbe,
        systemChanges,
        logMessage: `${updatedProbe.name} (AI): ${decision.reason}`,
      };

    case "mine_plutonium":
      updatedProbe.state = ProbeState.MiningPlutonium;
      updatedProbe.progress = 0;
      updatedProbe.miningBuffer = 0;
      return {
        probe: updatedProbe,
        systemChanges,
        logMessage: `${updatedProbe.name} (AI): ${decision.reason}`,
      };

    case "travel":
      if (decision.targetSystemId) {
        const targetSystem = systems.find(
          (s) => s.id === decision.targetSystemId
        );
        if (targetSystem) {
          const dist = Math.hypot(
            targetSystem.position.x - updatedProbe.position.x,
            targetSystem.position.y - updatedProbe.position.y
          );
          const fuelNeeded = Math.floor(dist * FUEL_CONSUMPTION_RATE);

          if (updatedProbe.inventory.Plutonium >= fuelNeeded) {
            updatedProbe.state = ProbeState.Traveling;
            updatedProbe.targetSystemId = decision.targetSystemId;
            updatedProbe.progress = 0;
            updatedProbe.inventory.Plutonium -= fuelNeeded;
            return {
              probe: updatedProbe,
              systemChanges,
              logMessage: `${updatedProbe.name} (AI): ${decision.reason}`,
            };
          }
        }
      }
      break;

    case "scan":
      updatedProbe.state = ProbeState.Scanning;
      updatedProbe.progress = 0;
      return {
        probe: updatedProbe,
        systemChanges,
        logMessage: `${updatedProbe.name} (AI): ${decision.reason}`,
      };

    case "research":
      updatedProbe.state = ProbeState.Researching;
      updatedProbe.progress = 0;
      return {
        probe: updatedProbe,
        systemChanges,
        logMessage: `${updatedProbe.name} (AI): ${decision.reason}`,
      };

    case "deploy_relay":
      // Relay deployment handled by separate handler
      // For now, just log and stay idle
      return {
        probe: updatedProbe,
        systemChanges,
        logMessage: `${updatedProbe.name} (AI): ${decision.reason} (manual deployment required)`,
      };

    case "idle":
      return {
        probe: updatedProbe,
        systemChanges,
        logMessage: `${updatedProbe.name} (AI): ${decision.reason}`,
      };
  }

  return { probe: updatedProbe, systemChanges };
};

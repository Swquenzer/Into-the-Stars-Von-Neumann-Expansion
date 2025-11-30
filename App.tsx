
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Probe, SolarSystem, ResourceType, ProbeState, ProbeModel, Coordinates, ProbeBlueprint, ProbeStats, AutonomyState } from './types';
import { UNIVERSE_WIDTH, UNIVERSE_HEIGHT, SYSTEM_COUNT, FUEL_CONSUMPTION_RATE, MINING_TICK_RATE, PASSIVE_SCAN_RANGE, DEFAULT_BLUEPRINTS, PROBE_STATS, SECTOR_SIZE, TURN_COST_PER_DEGREE, SOLAR_SAIL_SPEED_MULTIPLIER, UPGRADE_COSTS, BASE_COST, COST_MULTIPLIERS } from './constants';
import { generateSystemLore, generateProbeName } from './services/geminiService';
import { StarMap } from './components/StarMap';
import { ControlPanel } from './components/ControlPanel';
import { ProbeDesigner } from './components/ProbeDesigner';

// --- Helper Functions ---
const generateCoordinatesInSector = (sectorX: number, sectorY: number): Coordinates => {
  return {
    x: (sectorX * SECTOR_SIZE) + Math.floor(Math.random() * (SECTOR_SIZE - 100)) + 50,
    y: (sectorY * SECTOR_SIZE) + Math.floor(Math.random() * (SECTOR_SIZE - 100)) + 50,
  };
};

const generateSystemName = (i: number) => {
  const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Omicron', 'Sigma'];
  const suffixes = ['Majoris', 'Minoris', 'Prime', 'Centauri', 'Cygni', 'Lyrae', 'Eridani', 'V', 'X', 'B'];
  return `${prefixes[i % prefixes.length]} ${suffixes[Math.floor(Math.random() * suffixes.length)]} ${Math.floor(Math.random() * 999)}`;
};

// Generates systems for a specific spatial sector
const generateSystemsForSector = (sectorX: number, sectorY: number, earthPos: Coordinates): SolarSystem[] => {
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
       const base = 10 + (50 * distFactor);
       const variance = (Math.random() * 30) - 15;
       return Math.floor(Math.max(5, Math.min(100, base + variance)));
    };

    const getYield = (multiplier: number) => {
       const base = 1000 + (9000 * distFactor);
       const variance = 0.8 + (Math.random() * 0.4);
       return Math.floor(base * variance * multiplier);
    };

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
      }
    });
  }
  return newSystems;
};

// --- Autonomy Logic Helper ---
const manageAutonomousProbe = (probe: Probe, systems: SolarSystem[], addLog: (msg: string) => void): Probe => {
    // Phase 1: Immediate Data Collection (Analyzes system if just arrived)
    const currentSys = systems.find(s => s.id === probe.locationId);
    if (currentSys && !currentSys.analyzed) {
        currentSys.analyzed = true; // Mutating system reference here works because we're inside the tick loop where systems are being copied
    }

    // Phase 1b: Active Scanning (if not done recently/at all)
    // Heuristic: If there are undiscovered systems nearby, scan.
    // Simplified: Always scan if arriving at a new system to ensure local map is updated.
    if (probe.state === ProbeState.Idle) {
         return { ...probe, state: ProbeState.Scanning, progress: 0 };
    }
    
    return probe;
}


const createInitialState = (): GameState => {
  const earthPos = { x: UNIVERSE_WIDTH / 2, y: UNIVERSE_HEIGHT / 2 };
  const earth: SolarSystem = {
    id: 'sys-earth',
    name: 'Earth',
    position: earthPos,
    visited: true,
    analyzed: true,
    discovered: true,
    lore: "The cradle of humanity. Depleted of easy resources, but the launchpad for the future.",
    resources: { [ResourceType.Metal]: 10, [ResourceType.Plutonium]: 10 },
    resourceYield: { [ResourceType.Metal]: 1000, [ResourceType.Plutonium]: 500 },
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
      id: 'sys-neighbor-1',
      name: 'Proxima Centauri',
      position: n1Pos,
      visited: false,
      analyzed: false,
      discovered: true,
      resources: { [ResourceType.Metal]: 30, [ResourceType.Plutonium]: 20 },
      resourceYield: { [ResourceType.Metal]: 2000, [ResourceType.Plutonium]: 800 }
  });

   const n2Pos = { x: earthPos.x - 200, y: earthPos.y + 350 };
   systems.push({
      id: 'sys-neighbor-2',
      name: 'Wolf 359',
      position: n2Pos,
      visited: false,
      analyzed: false,
      discovered: true,
      resources: { [ResourceType.Metal]: 40, [ResourceType.Plutonium]: 15 },
      resourceYield: { [ResourceType.Metal]: 1500, [ResourceType.Plutonium]: 1000 }
  });


  const initialProbe: Probe = {
    id: 'probe-0',
    name: 'Genesis-1',
    model: ProbeModel.MarkI,
    state: ProbeState.Idle,
    locationId: 'sys-earth',
    originSystemId: 'sys-earth',
    lastScannedSystemId: 'sys-earth', // Assume earth is scanned
    position: { ...earth.position },
    targetSystemId: null,
    inventory: { [ResourceType.Metal]: 100, [ResourceType.Plutonium]: 100 },
    stats: PROBE_STATS[ProbeModel.MarkI],
    progress: 0,
    miningBuffer: 0,
    isAutonomyEnabled: true, // Default to true for consistency, though it starts with level 0
    lastDiversionCheck: Date.now()
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
    logs: ['Mission Control initialized.', 'Genesis-1 ready for orders.'],
  };
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const lastTickRef = useRef<number>(Date.now());
  const rafRef = useRef<number>(0);

  // --- Actions ---

  const handleSelectSystem = (id: string) => {
    setGameState(prev => ({ ...prev, selectedSystemId: id }));
  };

  const handleSelectProbe = (id: string) => {
    setGameState(prev => ({ ...prev, selectedProbeId: id }));
  };

  const handleRenameProbe = (id: string, newName: string) => {
    setGameState(prev => ({
      ...prev,
      probes: prev.probes.map(p => p.id === id ? { ...p, name: newName } : p),
      logs: [...prev.logs, `Unit ${prev.probes.find(p => p.id === id)?.name} renamed to ${newName}.`]
    }));
  };

  const handleToggleAutonomy = (id: string) => {
    setGameState(prev => ({
      ...prev,
      probes: prev.probes.map(p => p.id === id ? { ...p, isAutonomyEnabled: !p.isAutonomyEnabled } : p),
      logs: [...prev.logs, `Unit ${prev.probes.find(p => p.id === id)?.name} autonomous systems ${prev.probes.find(p => p.id === id)?.isAutonomyEnabled ? 'disabled' : 'enabled'}.`]
    }));
  };

  const handleAnalyze = async (systemId: string) => {
    const system = gameState.systems.find(s => s.id === systemId);
    if (!system || system.analyzed) return;

    // Check presence: A probe must be docked (not traveling/exploring) at the location
    const probePresent = gameState.probes.some(p => p.locationId === systemId && p.state !== ProbeState.Traveling && p.state !== ProbeState.Exploring);
    
    if (!probePresent) {
      setGameState(prev => ({
        ...prev,
        logs: [...prev.logs, `Analysis failed: No docked probe available at ${system.name}.`]
      }));
      return;
    }

    // Optimistic update
    setGameState(prev => ({
      ...prev,
      systems: prev.systems.map(s => s.id === systemId ? { ...s, analyzed: true } : s),
      logs: [...prev.logs, `Analyzing signal from ${system.name}...`]
    }));

    const lore = await generateSystemLore(system);
    
    setGameState(prev => ({
      ...prev,
      systems: prev.systems.map(s => s.id === systemId ? { ...s, lore } : s),
      logs: [...prev.logs, `Analysis complete for ${system.name}.`]
    }));
  };

  const handleLaunch = (targetSystemId: string) => {
    setGameState(prev => {
      const probe = prev.probes.find(p => p.id === prev.selectedProbeId);
      const startSys = prev.systems.find(s => s.id === probe?.locationId);
      const targetSys = prev.systems.find(s => s.id === targetSystemId);
      
      if (!probe || !startSys || !targetSys) return prev;

      const dist = Math.sqrt(Math.pow(targetSys.position.x - startSys.position.x, 2) + Math.pow(targetSys.position.y - startSys.position.y, 2));
      const fuelNeeded = Math.floor(dist * FUEL_CONSUMPTION_RATE);

      const hasFuel = probe.inventory.Plutonium >= fuelNeeded;
      
      const updatedProbe: Probe = {
        ...probe,
        state: ProbeState.Traveling,
        targetSystemId: targetSys.id,
        inventory: {
          ...probe.inventory,
          Plutonium: hasFuel ? probe.inventory.Plutonium - fuelNeeded : probe.inventory.Plutonium // If no fuel, we keep what we have (likely 0)
        },
        progress: 0, 
        miningBuffer: 0,
        isSolarSailing: !hasFuel // Solar sail if insufficient fuel
      };

      const logMsg = hasFuel 
        ? `${probe.name} launching to ${targetSys.name}.`
        : `${probe.name} deploying solar sails for slow transit to ${targetSys.name}.`;

      return {
        ...prev,
        probes: prev.probes.map(p => p.id === probe.id ? updatedProbe : p),
        logs: [...prev.logs, logMsg]
      };
    });
  };

  const handleDeepSpaceLaunch = (heading: number) => {
    setGameState(prev => {
        const probe = prev.probes.find(p => p.id === prev.selectedProbeId);
        if (!probe) return prev;

        // CASE 1: Launch from Idle (Standard Deep Space Launch)
        if (probe.state === ProbeState.Idle) {
            // Push probe outside docking radius (5) to prevent immediate re-capture.
            // Using 10 units to be safe.
            const rad = (heading * Math.PI) / 180;
            const pushDistance = 10;
            const newPos = {
                x: probe.position.x + Math.cos(rad) * pushDistance,
                y: probe.position.y + Math.sin(rad) * pushDistance
            };

            const isLowFuel = probe.inventory.Plutonium <= 0;

            return {
                ...prev,
                probes: prev.probes.map(p => p.id === probe.id ? {
                    ...p,
                    state: ProbeState.Exploring,
                    heading: heading,
                    locationId: null, // Undock
                    targetSystemId: null,
                    position: newPos,
                    lastSafetyCheck: Date.now(),
                    lastDiversionCheck: Date.now(),
                    isSolarSailing: isLowFuel
                } : p),
                logs: [...prev.logs, `${probe.name} engaging ${isLowFuel ? 'solar sails' : 'thrusters'} on heading ${heading}°.`]
            };
        }
        
        // CASE 2: Adjust Course while Exploring
        if (probe.state === ProbeState.Exploring) {
            const currentHeading = probe.heading || 0;
            let diff = Math.abs(heading - currentHeading);
            if (diff > 180) diff = 360 - diff;
            const cost = Math.ceil(diff * TURN_COST_PER_DEGREE);

            let newPlutonium = probe.inventory.Plutonium - cost;
            let isSailing = probe.isSolarSailing;
            let logMessage = `${probe.name} adjusted course to ${heading}°. Burned ${cost} Pu.`;

            if (newPlutonium < 0) {
                newPlutonium = 0;
                isSailing = true;
                logMessage = `Emergency maneuver executed. Fuel depleted. ${probe.name} switching to solar sails.`;
            }

            return {
                ...prev,
                probes: prev.probes.map(p => p.id === probe.id ? {
                    ...p,
                    heading: heading,
                    inventory: { ...p.inventory, Plutonium: newPlutonium },
                    isSolarSailing: isSailing
                } : p),
                logs: [...prev.logs, logMessage]
            }
        }

        return prev;
    });
  };

  const handleUpgradeProbe = (probeId: string, statKey: keyof ProbeStats) => {
    setGameState(prev => {
        const probe = prev.probes.find(p => p.id === probeId);
        if (!probe || probe.state !== ProbeState.Idle) return prev;

        const upgradeConfig = UPGRADE_COSTS[statKey];
        if (!upgradeConfig) return prev;

        const currentVal = probe.stats[statKey];
        // Calculate scaling factor. For scanRange (e.g. 300), we divide by increment (50) to get a "level" of 6.
        // For others (e.g. 1, 2), we use the value directly.
        let levelFactor = currentVal;
        if (statKey === 'scanRange') {
            levelFactor = currentVal / upgradeConfig.increment;
        }

        const metalCost = Math.floor(upgradeConfig.Metal * levelFactor);
        const plutoniumCost = Math.floor(upgradeConfig.Plutonium * levelFactor);

        if (probe.inventory.Metal < metalCost || probe.inventory.Plutonium < plutoniumCost) {
            return { ...prev, logs: [...prev.logs, `Upgrade failed: Insufficient resources.`] };
        }

        return {
            ...prev,
            probes: prev.probes.map(p => p.id === probeId ? {
                ...p,
                inventory: {
                    Metal: p.inventory.Metal - metalCost,
                    Plutonium: p.inventory.Plutonium - plutoniumCost
                },
                stats: {
                    ...p.stats,
                    [statKey]: currentVal + upgradeConfig.increment
                },
                // Enable autonomy if this was an AI upgrade
                isAutonomyEnabled: statKey === 'autonomyLevel' ? true : p.isAutonomyEnabled
            } : p),
            logs: [...prev.logs, `${probe.name} upgraded ${upgradeConfig.name} (Level ${levelFactor + 1}).`]
        };
    });
  };

  const handleMine = (resource: ResourceType) => {
    setGameState(prev => {
      const probe = prev.probes.find(p => p.id === prev.selectedProbeId);
      if (!probe || probe.locationId === null) return prev;
      
      const system = prev.systems.find(s => s.id === probe.locationId);
      if (!system || system.resourceYield[resource] <= 0) return prev;

      const newState = resource === ResourceType.Metal ? ProbeState.MiningMetal : ProbeState.MiningPlutonium;

      return {
        ...prev,
        probes: prev.probes.map(p => p.id === probe.id ? { ...p, state: newState, progress: 0, miningBuffer: 0 } : p),
        logs: [...prev.logs, `${probe.name} beginning ${resource} extraction.`]
      };
    });
  };

  const handleStopOperation = () => {
    setGameState(prev => {
      const probe = prev.probes.find(p => p.id === prev.selectedProbeId);
      if (!probe) return prev;
      
      // Allow stopping Mining or Replicating
      if (probe.state !== ProbeState.MiningMetal && 
          probe.state !== ProbeState.MiningPlutonium && 
          probe.state !== ProbeState.Replicating) {
            return prev;
      }
      
      let updatedProbe = { ...probe, state: ProbeState.Idle, progress: 0, miningBuffer: 0 };
      let logMsg = `${probe.name} halted operations.`;

      // If stopping replication, refund resources
      if (probe.state === ProbeState.Replicating && probe.pendingBlueprint) {
          const cost = probe.pendingBlueprint.cost;
          updatedProbe.inventory = {
              Metal: probe.inventory.Metal + cost.Metal,
              Plutonium: probe.inventory.Plutonium + cost.Plutonium
          };
          updatedProbe.pendingBlueprint = undefined;
          logMsg = `${probe.name} halted replication. Resources refunded.`;
      }

      return {
        ...prev,
        probes: prev.probes.map(p => p.id === probe.id ? updatedProbe : p),
        logs: [...prev.logs, logMsg]
      };
    });
  };

  const handleScan = () => {
    setGameState(prev => {
      const probe = prev.probes.find(p => p.id === prev.selectedProbeId);
      if (!probe || probe.state !== ProbeState.Idle) return prev;

      return {
        ...prev,
        probes: prev.probes.map(p => p.id === probe.id ? { ...p, state: ProbeState.Scanning, progress: 0 } : p),
        logs: [...prev.logs, `${probe.name} initializing wide-band sensor sweep.`]
      };
    });
  };

  const smartHandleReplicate = (blueprint: ProbeBlueprint) => {
      setGameState(prev => {
        const parentProbe = prev.probes.find(p => p.id === prev.selectedProbeId);
        if (!parentProbe) return prev;

        const cost = blueprint.cost;

        if (parentProbe.inventory.Metal < cost.Metal || parentProbe.inventory.Plutonium < cost.Plutonium) {
            return { ...prev, logs: [...prev.logs, `Replication failed: Insufficient resources.`] };
        }

        return {
            ...prev,
            probes: prev.probes.map(p => p.id === parentProbe.id ? {
            ...p,
            state: ProbeState.Replicating,
            progress: 0,
            miningBuffer: 0,
            inventory: {
                Metal: p.inventory.Metal - cost.Metal,
                Plutonium: p.inventory.Plutonium - cost.Plutonium
            },
            pendingBlueprint: blueprint 
            } as Probe : p),
            logs: [...prev.logs, `${parentProbe.name} starting fabrication of ${blueprint.name}.`]
        };
      });
  }

  const handleOpenDesigner = (blueprint?: ProbeBlueprint) => setGameState(p => ({ ...p, isDesignerOpen: true, editingBlueprint: blueprint }));
  const handleCloseDesigner = () => setGameState(p => ({ ...p, isDesignerOpen: false, editingBlueprint: undefined }));
  
  const handleSaveBlueprint = (bp: ProbeBlueprint) => {
    setGameState(prev => {
      const existingIndex = prev.blueprints.findIndex(b => b.id === bp.id);
      let newBlueprints = [...prev.blueprints];
      let logMsg = '';

      if (existingIndex > -1) {
          newBlueprints[existingIndex] = bp;
          logMsg = `Blueprint '${bp.name}' updated.`;
      } else {
          newBlueprints.push(bp);
          logMsg = `New Design '${bp.name}' saved to archives.`;
      }

      return {
        ...prev,
        blueprints: newBlueprints,
        isDesignerOpen: false,
        editingBlueprint: undefined,
        logs: [...prev.logs, logMsg]
      };
    });
  };

  const handleDeleteBlueprint = (id: string) => {
    setGameState(prev => ({
      ...prev,
      blueprints: prev.blueprints.filter(b => b.id !== id),
      logs: [...prev.logs, `Blueprint deleted.`]
    }));
  };

  const handleSelfDestruct = (probeId: string) => {
    setGameState(prev => ({
      ...prev,
      probes: prev.probes.filter(p => p.id !== probeId),
      selectedProbeId: prev.selectedProbeId === probeId ? null : prev.selectedProbeId,
      logs: [...prev.logs, `Unit ${prev.probes.find(p => p.id === probeId)?.name} self-destruct sequence initiated. Signal lost.`]
    }));
  };

  const handleExportSave = () => {
    const dataToSave = {
        ...gameState,
        // Convert Set to Array for JSON serialization
        generatedSectors: Array.from(gameState.generatedSectors),
        // Don't save transient UI state
        isDesignerOpen: false,
        editingBlueprint: undefined
    };

    const jsonString = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `von-neumann-save-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setGameState(prev => ({
        ...prev,
        logs: [...prev.logs, 'Game state exported successfully.']
    }));
  };

  const handleImportSave = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const loadedData = JSON.parse(text);

        // Basic validation
        if (!loadedData.systems || !loadedData.probes) {
          throw new Error("Invalid save file format.");
        }

        // Deserialize generatedSectors from Array to Set
        if (loadedData.generatedSectors && Array.isArray(loadedData.generatedSectors)) {
          loadedData.generatedSectors = new Set(loadedData.generatedSectors);
        } else {
          loadedData.generatedSectors = new Set();
        }

        setGameState({
          ...loadedData,
          isDesignerOpen: false,
          editingBlueprint: undefined,
          logs: [...(loadedData.logs || []), 'Game loaded successfully.']
        });
      } catch (error) {
        console.error("Failed to load save file:", error);
        setGameState(prev => ({
          ...prev,
          logs: [...prev.logs, 'Error loading save file. Check console for details.']
        }));
      }
    };
    reader.readAsText(file);
  };

  // --- Game Loop ---
  
  const tick = useCallback(() => {
    const now = Date.now();
    const delta = now - lastTickRef.current;
    lastTickRef.current = now;

    setGameState(prev => {
      let systemsChanged = false;
      let generatedSectorsChanged = false;
      const newSystems = [...prev.systems];
      const newGeneratedSectors = new Set(prev.generatedSectors);
      const newProbes: Probe[] = [];
      const newLogs: string[] = [];
      const finalProbes: Probe[] = [];
      const createdProbes: Probe[] = [];
      
      // Optimization: Track where replications have occurred to prevent duplicates in same system
      const colonizedSystemIds = new Set<string>();
      prev.probes.forEach(p => {
          if (p.originSystemId) colonizedSystemIds.add(p.originSystemId);
      });

      const earthPos = prev.systems.find(s => s.id === 'sys-earth')?.position || {x: UNIVERSE_WIDTH/2, y: UNIVERSE_HEIGHT/2};

      prev.probes.forEach(probe => {
         let updatedProbe = { ...probe };

         // --- AUTONOMOUS PROBE LOGIC (AI Core) ---
         if (probe.stats.autonomyLevel > 0 && probe.state === ProbeState.Idle && probe.isAutonomyEnabled) {
            const currentSystem = newSystems.find(s => s.id === updatedProbe.locationId);
            
            // Priority 1: Instant Analysis upon arrival
            if (currentSystem && !currentSystem.analyzed) {
                // Mutate the system in our copy for immediate feedback
                const sysIdx = newSystems.findIndex(s => s.id === currentSystem.id);
                if (sysIdx > -1) {
                    newSystems[sysIdx] = { ...currentSystem, analyzed: true };
                    systemsChanged = true;
                }
            }
            
            // Priority 2: Scanning (ALWAYS scan if we haven't scanned here yet)
            if (probe.state === ProbeState.Idle && updatedProbe.locationId && updatedProbe.lastScannedSystemId !== updatedProbe.locationId) {
                updatedProbe.state = ProbeState.Scanning;
                updatedProbe.progress = 0;
                newLogs.push(`${updatedProbe.name} (AI) initializing sensor sweep of new system.`);
                // We don't continue to other logic because state changed to Scanning
            } 
            else if (probe.state === ProbeState.Idle) {
            
            // AI LOGIC START
            let actionTaken = false;

            // REPLICATOR LOGIC
            // Condition: Must have autonomy Level 2 AND must have moved from origin system
            if (updatedProbe.stats.autonomyLevel === 2 && updatedProbe.locationId && updatedProbe.originSystemId && updatedProbe.locationId !== updatedProbe.originSystemId) {
                
                // NEW: Check if any probe (existing or just created) originated in this system
                const hasReplicatedHere = colonizedSystemIds.has(updatedProbe.locationId);

                if (!hasReplicatedHere) {
                    const REPLICATION_THRESHOLD_M = 500; 
                    const REPLICATION_THRESHOLD_P = 300;
                    const REPLICATION_TIME = 60000; // 60s

                    if (updatedProbe.inventory.Metal >= REPLICATION_THRESHOLD_M && updatedProbe.inventory.Plutonium >= REPLICATION_THRESHOLD_P) {
                        // Start Replicating
                        updatedProbe.state = ProbeState.Replicating;
                        updatedProbe.progress = 0;
                        updatedProbe.pendingBlueprint = {
                            id: `auto-bp-${Date.now()}`,
                            name: updatedProbe.model,
                            stats: updatedProbe.stats,
                            cost: { Metal: REPLICATION_THRESHOLD_M, Plutonium: REPLICATION_THRESHOLD_P, time: REPLICATION_TIME },
                            isCustom: true
                        };
                        newLogs.push(`${updatedProbe.name} (AI) beginning self-replication.`);
                        updatedProbe.inventory.Metal -= REPLICATION_THRESHOLD_M;
                        updatedProbe.inventory.Plutonium -= REPLICATION_THRESHOLD_P;
                        actionTaken = true;
                        // Reserve this spot immediately in our local Set so other probes in this tick don't try to use it
                        colonizedSystemIds.add(updatedProbe.locationId);
                    } else if (currentSystem && (updatedProbe.inventory.Metal < REPLICATION_THRESHOLD_M || updatedProbe.inventory.Plutonium < REPLICATION_THRESHOLD_P)) {
                        // Need resources. Check local yield.
                        if (updatedProbe.inventory.Plutonium < REPLICATION_THRESHOLD_P && currentSystem.resourceYield.Plutonium > 0) {
                            updatedProbe.state = ProbeState.MiningPlutonium;
                            newLogs.push(`${updatedProbe.name} (AI) mining Plutonium for replication.`);
                            actionTaken = true;
                        } else if (updatedProbe.inventory.Metal < REPLICATION_THRESHOLD_M && currentSystem.resourceYield.Metal > 0) {
                            updatedProbe.state = ProbeState.MiningMetal;
                            newLogs.push(`${updatedProbe.name} (AI) mining Metal for replication.`);
                            actionTaken = true;
                        }
                    }
                }
            }

            // EXPLORATION LOGIC (Adventurer & Replicator)
            if (!actionTaken) {
                // Find nearest un-scanned (undiscovered? no, unvisited/unanalyzed) system.
                // Filter known systems.
                const candidates = newSystems.filter(s => s.discovered && (!s.visited || !s.analyzed) && s.id !== updatedProbe.locationId);
                let target: SolarSystem | null = null;
                let minDist = Infinity;
                
                candidates.forEach(s => {
                    const d = Math.hypot(s.position.x - updatedProbe.position.x, s.position.y - updatedProbe.position.y);
                    if (d < minDist) {
                        minDist = d;
                        target = s;
                    }
                });

                if (target) {
                    const dist = minDist;
                    const fuelNeeded = Math.floor(dist * FUEL_CONSUMPTION_RATE);
                    
                    if (updatedProbe.inventory.Plutonium >= fuelNeeded) {
                        // Launch
                        updatedProbe.state = ProbeState.Traveling;
                        updatedProbe.targetSystemId = (target as SolarSystem).id;
                        updatedProbe.progress = 0;
                        updatedProbe.inventory.Plutonium -= fuelNeeded;
                        newLogs.push(`${updatedProbe.name} (AI) departing for ${(target as SolarSystem).name}.`);
                        actionTaken = true;
                    } else {
                        // Need Fuel
                        if (currentSystem && currentSystem.resourceYield.Plutonium > 0) {
                            updatedProbe.state = ProbeState.MiningPlutonium;
                             newLogs.push(`${updatedProbe.name} (AI) refueling for transit.`);
                            actionTaken = true;
                        } else {
                            // Stuck: No fuel and no local fuel.
                        }
                    }
                } else {
                    // No known targets.
                    // Deep Space Decision
                    const DEEP_SPACE_FUEL_REQ = 30;

                    // Check if we need fuel for deep space
                    if (updatedProbe.inventory.Plutonium < DEEP_SPACE_FUEL_REQ && currentSystem && currentSystem.resourceYield.Plutonium > 0) {
                            updatedProbe.state = ProbeState.MiningPlutonium;
                            newLogs.push(`${updatedProbe.name} (AI) mining Plutonium for deep space expedition.`);
                            actionTaken = true;
                    } else {
                        // Proceed to launch (either we have enough fuel, or we can't mine more here)
                        const randomHeading = Math.floor(Math.random() * 360);
                        updatedProbe.state = ProbeState.Exploring;
                        updatedProbe.heading = randomHeading;
                        updatedProbe.locationId = null;
                        updatedProbe.targetSystemId = null;
                        
                        // Push out
                        const rad = (randomHeading * Math.PI) / 180;
                        updatedProbe.position.x += Math.cos(rad) * 10;
                        updatedProbe.position.y += Math.sin(rad) * 10;
                        updatedProbe.lastSafetyCheck = Date.now();
                        updatedProbe.lastDiversionCheck = Date.now();
                        
                        // Check Fuel for Deep Space
                        if (updatedProbe.inventory.Plutonium <= 0) {
                            updatedProbe.isSolarSailing = true;
                        }

                        newLogs.push(`${updatedProbe.name} (AI) heading into deep space (Vector ${randomHeading}).`);
                        actionTaken = true;
                    }
                }
            }
         }
         }
         
         // 1. Traveling (Known Route)
         if (updatedProbe.state === ProbeState.Traveling && updatedProbe.targetSystemId && updatedProbe.locationId) {
            const startSys = prev.systems.find(s => s.id === updatedProbe.locationId);
            const targetSys = prev.systems.find(s => s.id === updatedProbe.targetSystemId);
            
            if (startSys && targetSys) {
                const totalDist = Math.hypot(targetSys.position.x - startSys.position.x, targetSys.position.y - startSys.position.y);
                
                let speedMultiplier = 1;
                if (updatedProbe.isSolarSailing) speedMultiplier = SOLAR_SAIL_SPEED_MULTIPLIER;
                
                const unitsPerSecond = 10 * updatedProbe.stats.flightSpeed * speedMultiplier;
                const unitsTraveled = unitsPerSecond * (delta / 1000); 
                let newProgress = updatedProbe.progress + (unitsTraveled / totalDist);

                // Calculate current world position
                const currentPos = {
                    x: startSys.position.x + ((targetSys.position.x - startSys.position.x) * newProgress),
                    y: startSys.position.y + ((targetSys.position.y - startSys.position.y) * newProgress)
                };

                // Passive Scan
                newSystems.forEach((sys, idx) => {
                    if (!sys.discovered) {
                        const distToSys = Math.hypot(sys.position.x - currentPos.x, sys.position.y - currentPos.y);
                        if (distToSys <= PASSIVE_SCAN_RANGE) {
                            newSystems[idx] = { ...sys, discovered: true };
                            systemsChanged = true;
                            newLogs.push(`Proximity Alert: ${sys.name} detected by ${updatedProbe.name}.`);
                        }
                    }
                });

                if (newProgress >= 1) {
                  updatedProbe.state = ProbeState.Idle;
                  updatedProbe.locationId = targetSys.id;
                  updatedProbe.position = { ...targetSys.position };
                  updatedProbe.progress = 0;
                  updatedProbe.isSolarSailing = false; // Reset solar sailing status on arrival
                  newLogs.push(`${updatedProbe.name} arrived at ${targetSys.name}.`);
                  const sysIndex = newSystems.findIndex(s => s.id === targetSys.id);
                  if (sysIndex > -1) {
                    if (!newSystems[sysIndex].visited || !newSystems[sysIndex].discovered) {
                        newSystems[sysIndex] = { ...newSystems[sysIndex], visited: true, discovered: true };
                        systemsChanged = true;
                    }
                  }
                } else {
                  updatedProbe.progress = newProgress;
                  updatedProbe.position = currentPos;
                }
            }
         }
         // 2. Exploring (Vector Movement)
         else if (updatedProbe.state === ProbeState.Exploring && updatedProbe.heading !== undefined) {
             const rad = (updatedProbe.heading * Math.PI) / 180;
             let speed = 10 * updatedProbe.stats.flightSpeed;
             
             // Check fuel status for exploring
             const hasFuel = updatedProbe.inventory.Plutonium > 0;
             if (!hasFuel) {
                 speed *= SOLAR_SAIL_SPEED_MULTIPLIER;
             }

             const moveDist = speed * (delta / 1000);
             const dx = Math.cos(rad) * moveDist;
             const dy = Math.sin(rad) * moveDist;

             updatedProbe.position = {
                 x: updatedProbe.position.x + dx,
                 y: updatedProbe.position.y + dy
             };

             // Continuous Fuel Burn (Only if we have fuel)
             if (hasFuel) {
                 const distTraveled = Math.sqrt(dx*dx + dy*dy);
                 const fuelCost = distTraveled * FUEL_CONSUMPTION_RATE;
                 updatedProbe.inventory.Plutonium = Math.max(0, updatedProbe.inventory.Plutonium - fuelCost);
             }

             // Check Sector Generation
             const sectorX = Math.floor(updatedProbe.position.x / SECTOR_SIZE);
             const sectorY = Math.floor(updatedProbe.position.y / SECTOR_SIZE);
             const sectorKey = `${sectorX},${sectorY}`;
             
             if (!newGeneratedSectors.has(sectorKey)) {
                 const newSectorSystems = generateSystemsForSector(sectorX, sectorY, earthPos);
                 newSystems.push(...newSectorSystems);
                 newGeneratedSectors.add(sectorKey);
                 systemsChanged = true;
                 generatedSectorsChanged = true;
             }

             // Auto-Dock Check: If close enough to a system, snap to it and dock
             let docked = false;
             for (let i = 0; i < newSystems.length; i++) {
                 const sys = newSystems[i];
                 const dist = Math.hypot(sys.position.x - updatedProbe.position.x, sys.position.y - updatedProbe.position.y);
                 
                 // Threshold: using 5 units as a safe buffer for "1 LY" (since speed can be >1 unit per tick)
                 if (dist <= 5) {
                     updatedProbe.state = ProbeState.Idle;
                     updatedProbe.locationId = sys.id;
                     updatedProbe.position = { ...sys.position };
                     updatedProbe.heading = undefined;
                     
                     newLogs.push(`${updatedProbe.name} entered gravity well of ${sys.name}. Docking initiated.`);
                     
                     if (!sys.visited || !sys.discovered) {
                         newSystems[i] = { ...sys, visited: true, discovered: true };
                         systemsChanged = true;
                     }
                     docked = true;
                     break;
                 }
             }

             if (!docked) {
                 // Passive Scan
                 newSystems.forEach((sys, idx) => {
                     if (!sys.discovered) {
                         const dist = Math.hypot(sys.position.x - updatedProbe.position.x, sys.position.y - updatedProbe.position.y);
                         if (dist <= PASSIVE_SCAN_RANGE) {
                             newSystems[idx] = { ...sys, discovered: true };
                             systemsChanged = true;
                             newLogs.push(`Exploration Update: ${sys.name} discovered.`);
                         }
                     }
                 });

                 // Auto-Divert for Autonomous Probes
                 if (updatedProbe.stats.autonomyLevel > 0 && updatedProbe.isAutonomyEnabled && 
                    (!updatedProbe.lastDiversionCheck || now - updatedProbe.lastDiversionCheck > 1000)) {
                    
                     updatedProbe.lastDiversionCheck = now;
                     // Find nearby valid targets (Discovered but not Visited/Analyzed)
                     const range = updatedProbe.stats.scanRange;
                     const candidates = newSystems.filter(s => s.discovered && (!s.visited || !s.analyzed));
                     
                     let nearestUnexplored: SolarSystem | null = null;
                     let minUnexploredDist = range; // Must be within scan range to divert

                     candidates.forEach(s => {
                         const d = Math.hypot(s.position.x - updatedProbe.position.x, s.position.y - updatedProbe.position.y);
                         if (d < minUnexploredDist) {
                             minUnexploredDist = d;
                             nearestUnexplored = s;
                         }
                     });

                     if (nearestUnexplored) {
                         // Calculate new heading
                         const tSys = nearestUnexplored as SolarSystem;
                         const tx = tSys.position.x - updatedProbe.position.x;
                         const ty = tSys.position.y - updatedProbe.position.y;
                         let targetHeading = (Math.atan2(ty, tx) * 180) / Math.PI;
                         if (targetHeading < 0) targetHeading += 360;

                         // Calculate Turn Cost
                         let diff = Math.abs(targetHeading - (updatedProbe.heading || 0));
                         if (diff > 180) diff = 360 - diff;
                         const turnCost = diff * TURN_COST_PER_DEGREE;

                         // Execute Turn (Drain fuel if needed)
                         updatedProbe.heading = targetHeading;
                         if (updatedProbe.inventory.Plutonium >= turnCost) {
                             updatedProbe.inventory.Plutonium -= turnCost;
                         } else {
                             updatedProbe.inventory.Plutonium = 0;
                             updatedProbe.isSolarSailing = true;
                         }
                         newLogs.push(`${updatedProbe.name} (AI) auto-diverting to ${tSys.name}.`);
                     }
                 }


                 // Safety Protocol Check (Every 1s) - ONLY if we have fuel. If sailing, we are on our own/already limp mode.
                 if (hasFuel && (!updatedProbe.lastSafetyCheck || now - updatedProbe.lastSafetyCheck > 1000)) {
                     updatedProbe.lastSafetyCheck = now;
                     
                     // Find nearest safe harbor (visited or discovered systems)
                     let nearest: SolarSystem | null = null;
                     let minDist = Infinity;
                     
                     const safeSystems = newSystems.filter(s => s.discovered);
                     
                     safeSystems.forEach(s => {
                         const d = Math.hypot(s.position.x - updatedProbe.position.x, s.position.y - updatedProbe.position.y);
                         if (d < minDist) {
                             minDist = d;
                             nearest = s;
                         }
                     });

                     if (nearest) {
                         // Calculate fuel needed to return INCLUDING turn cost
                         const travelReturnCost = minDist * FUEL_CONSUMPTION_RATE;
                         
                         // Calculate turn needed
                         const dx = (nearest as SolarSystem).position.x - updatedProbe.position.x;
                         const dy = (nearest as SolarSystem).position.y - updatedProbe.position.y;
                         let targetHeading = (Math.atan2(dy, dx) * 180) / Math.PI;
                         if (targetHeading < 0) targetHeading += 360;
                         
                         let diff = Math.abs(targetHeading - (updatedProbe.heading || 0));
                         if (diff > 180) diff = 360 - diff;
                         const turnReturnCost = diff * TURN_COST_PER_DEGREE;

                         const totalReturnCost = travelReturnCost + turnReturnCost;
                         const safetyMargin = 1.2; // 20% buffer
                         
                         if (updatedProbe.inventory.Plutonium < (totalReturnCost * safetyMargin)) {
                             // AUTO RE-ROUTE
                             updatedProbe.heading = targetHeading; // Point to safety
                             updatedProbe.inventory.Plutonium = Math.max(0, updatedProbe.inventory.Plutonium - turnReturnCost); // Pay for the turn now or we die
                             newLogs.push(`CRITICAL FUEL: ${updatedProbe.name} auto-adjusting course for ${(nearest as SolarSystem).name}.`);
                         }
                     }
                 }
             }
         }
         // 3. Mining
         else if ((updatedProbe.state === ProbeState.MiningMetal || updatedProbe.state === ProbeState.MiningPlutonium) && updatedProbe.locationId) {
             const sysIndex = newSystems.findIndex(s => s.id === updatedProbe.locationId);
             if (sysIndex > -1) {
                const system = newSystems[sysIndex];
                const resourceType = updatedProbe.state === ProbeState.MiningMetal ? ResourceType.Metal : ResourceType.Plutonium;
                
                if (system.resourceYield[resourceType] > 0) {
                    const abundanceFactor = system.resources[resourceType] / 100;
                    const speedMultiplier = updatedProbe.stats.miningSpeed; 
                    const baseRate = 2.0; 
                    const ratePerSecond = baseRate * abundanceFactor * speedMultiplier;
                    const amountToAdd = ratePerSecond * (delta / 1000); 
                    updatedProbe.miningBuffer += amountToAdd;

                    if (updatedProbe.miningBuffer >= 1) {
                        const transferAmount = Math.floor(updatedProbe.miningBuffer);
                        const actualTransfer = Math.min(transferAmount, system.resourceYield[resourceType]);
                        updatedProbe.inventory[resourceType] += actualTransfer;
                        updatedProbe.miningBuffer -= transferAmount;
                        
                        newSystems[sysIndex] = {
                            ...system,
                            resourceYield: {
                                ...system.resourceYield,
                                [resourceType]: system.resourceYield[resourceType] - actualTransfer
                            }
                        };
                        systemsChanged = true;
                    }
                    updatedProbe.progress = Math.min(updatedProbe.miningBuffer * 100, 100);
                } else {
                    updatedProbe.state = ProbeState.Idle;
                    updatedProbe.progress = 0;
                    updatedProbe.miningBuffer = 0;
                    newLogs.push(`${updatedProbe.name} halted. ${resourceType} depleted.`);
                }
             }
         }
         // 4. Replicating
         else if (updatedProbe.state === ProbeState.Replicating) {
             const pendingBlueprint = updatedProbe.pendingBlueprint;
             if (pendingBlueprint) {
                 const baseTime = pendingBlueprint.cost.time;
                 const speed = Math.max(0.1, updatedProbe.stats.replicationSpeed);
                 const effectiveTime = baseTime / speed;
                 updatedProbe.progress += (delta / effectiveTime) * 100;

                 if (updatedProbe.progress >= 100) {
                     updatedProbe.state = ProbeState.Idle;
                     updatedProbe.progress = 0;
                     const newId = `probe-${Date.now()}-${Math.floor(Math.random()*1000)}`;
                     
                     if (!pendingBlueprint.isCustom) {
                         generateProbeName(pendingBlueprint.name).then(name => {
                            setGameState(g => ({
                                ...g,
                                probes: g.probes.map(p => p.id === newId ? {...p, name} : p)
                            }));
                         });
                     }

                     const newProbe: Probe = {
                        id: newId,
                        name: pendingBlueprint.isCustom ? `${pendingBlueprint.name}-${Math.floor(Math.random()*100)}` : 'Constructing...',
                        model: pendingBlueprint.name,
                        state: ProbeState.Idle,
                        locationId: updatedProbe.locationId,
                        originSystemId: updatedProbe.locationId, // Mark birth system
                        lastScannedSystemId: updatedProbe.locationId, // Inherit known map status roughly? No, assume not scanned by new probe.
                        position: { ...updatedProbe.position },
                        targetSystemId: null,
                        inventory: pendingBlueprint.initialInventory ? { ...pendingBlueprint.initialInventory } : { Metal: 0, Plutonium: 0 },
                        stats: pendingBlueprint.stats,
                        progress: 0,
                        miningBuffer: 0,
                        isSolarSailing: false,
                        isAutonomyEnabled: true, // New AI probes default to ON
                        lastDiversionCheck: Date.now()
                     };
                     
                     createdProbes.push(newProbe);
                     if (updatedProbe.locationId) {
                        colonizedSystemIds.add(updatedProbe.locationId);
                     }
                     
                     newLogs.push(`${updatedProbe.name} finished building ${pendingBlueprint.name}.`);
                     delete updatedProbe.pendingBlueprint;
                 }
             } else {
                 updatedProbe.state = ProbeState.Idle;
             }
         }
         // 5. Active Scanning
         else if (updatedProbe.state === ProbeState.Scanning) {
            const scanSpeed = updatedProbe.stats.scanSpeed * (delta / 30);
            updatedProbe.progress += scanSpeed;
            
            if (updatedProbe.progress >= 100) {
                updatedProbe.state = ProbeState.Idle;
                updatedProbe.progress = 0;
                // Mark current location as scanned so we don't loop
                if (updatedProbe.locationId) {
                    updatedProbe.lastScannedSystemId = updatedProbe.locationId;
                }
                
                let foundCount = 0;
                const range = updatedProbe.stats.scanRange;

                // Check Sector Generation (Added to Scanning)
                const sectorX = Math.floor(updatedProbe.position.x / SECTOR_SIZE);
                const sectorY = Math.floor(updatedProbe.position.y / SECTOR_SIZE);
                const sectorKey = `${sectorX},${sectorY}`;
                
                if (!newGeneratedSectors.has(sectorKey)) {
                    const newSectorSystems = generateSystemsForSector(sectorX, sectorY, earthPos);
                    newSystems.push(...newSectorSystems);
                    newGeneratedSectors.add(sectorKey);
                    systemsChanged = true;
                    generatedSectorsChanged = true;
                    newLogs.push(`Uncharted sector mapped by ${updatedProbe.name}.`);
                }
                
                newSystems.forEach((sys, idx) => {
                    if (!sys.discovered) {
                        const dist = Math.hypot(sys.position.x - updatedProbe.position.x, sys.position.y - updatedProbe.position.y);
                        if (dist <= range) {
                            newSystems[idx] = { ...sys, discovered: true };
                            foundCount++;
                            systemsChanged = true;
                        }
                    }
                });

                if (foundCount > 0) {
                    newLogs.push(`${updatedProbe.name} scan complete. ${foundCount} new system(s) found.`);
                } else {
                    newLogs.push(`${updatedProbe.name} scan complete. No new signals detected.`);
                }
            }
         }

         finalProbes.push(updatedProbe);
      });

      return {
        ...prev,
        systems: systemsChanged ? newSystems : prev.systems,
        probes: [...finalProbes, ...createdProbes],
        generatedSectors: generatedSectorsChanged ? newGeneratedSectors : prev.generatedSectors,
        logs: newLogs.length > 0 ? [...prev.logs, ...newLogs] : prev.logs
      };
    });

    rafRef.current = requestAnimationFrame(tick);
  }, []); 

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  return (
    <div className="flex w-screen h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <div className="flex-1 relative">
        <StarMap 
            gameState={gameState} 
            onSystemSelect={handleSelectSystem} 
            onProbeSelect={handleSelectProbe} 
        />
      </div>
      <ControlPanel 
        gameState={gameState}
        onLaunch={handleLaunch}
        onDeepSpaceLaunch={handleDeepSpaceLaunch}
        onMine={handleMine}
        onStopOperation={handleStopOperation}
        onReplicate={smartHandleReplicate}
        onAnalyze={handleAnalyze}
        onSystemSelect={handleSelectSystem} 
        onProbeSelect={handleSelectProbe}
        onRenameProbe={handleRenameProbe}
        onScan={handleScan}
        onOpenDesigner={handleOpenDesigner}
        onDeleteBlueprint={handleDeleteBlueprint}
        onUpgradeProbe={handleUpgradeProbe}
        onSelfDestruct={handleSelfDestruct}
        onToggleAutonomy={handleToggleAutonomy}
        onExportSave={handleExportSave}
        onImportSave={handleImportSave}
      />
      {gameState.isDesignerOpen && (
          <ProbeDesigner 
            initialBlueprint={gameState.editingBlueprint}
            onClose={handleCloseDesigner} 
            onSave={handleSaveBlueprint} 
          />
      )}
    </div>
  );
}

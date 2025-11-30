# Copilot Instructions: Von Neumann Expansion

## Project Overview

This is a React-based 2D space exploration/incremental strategy game where players control self-replicating Von Neumann probes. Built with React 19, TypeScript, Vite, and integrates Google Gemini API for procedural narrative generation.

## Architecture

### Modular Game Loop Pattern

- **`App.tsx`** (~350 lines): Orchestrates game loop, manages state, wires handlers to UI components
- **`GameState`**: Single source of truth for systems, probes, blueprints, logs, UI state
- **Game loop**: `requestAnimationFrame` with delta-time calculations for frame-independent physics
- **Separation**: Logic extracted to `logic/`, user actions to `handlers/`, utilities to `utils/`

### Directory Structure

```
App.tsx                   # State orchestration & game loop coordination
├── handlers/             # User action handlers (take setGameState, return void)
│   ├── blueprintHandlers.ts    # Designer UI: open/close/save/delete
│   ├── navigationHandlers.ts   # Launch (point-to-point & deep space)
│   ├── operationHandlers.ts    # Mine, scan, replicate, stop, research
│   ├── probeHandlers.ts         # Rename, autonomy toggle, upgrade, self-destruct
│   ├── saveHandlers.ts          # Import/export save files
│   ├── scienceHandlers.ts       # Purchase science unlocks
│   ├── selectionHandlers.ts    # UI selection state
│   └── systemHandlers.ts        # System analysis
├── logic/                # Pure functions (return updated state + side effects)
│   ├── autonomySystem.ts        # AI decision-making (processAutonomousProbe)
│   ├── gameLoop.ts              # State processors per ProbeState
│   └── sectorGeneration.ts     # Procedural universe generation
└── utils/gameHelpers.ts  # Initial state, coordinate generation, distance calcs
```

### Type System (`types.ts`)

- **ProbeState enum**: 8 states (Idle, Mining\*, Traveling, Replicating, Scanning, Exploring, Researching)
- **Key interfaces**: `Probe`, `SolarSystem`, `ProbeStats`, `ProbeBlueprint`, `GameState`
- Probes track both discrete location (`locationId`) and continuous position (`{ x, y }`)
- Systems have 3 visibility states: `discovered` (on map), `visited` (probe arrived), `analyzed` (resources revealed)

### UI Component Structure

```
App.tsx
├── StarMap.tsx              # Canvas rendering, pan/zoom, click selection
├── ControlPanel.tsx         # Tabbed sidebar container
│   └── panels/
│       ├── ProbesListPanel.tsx      # Probe list, rename, autonomy toggle
│       ├── SystemsListPanel.tsx     # System list, selection, analysis
│       ├── OperationsListPanel.tsx  # Active probe controls (mine/travel/scan)
│       ├── LogsListPanel.tsx        # Event log display
│       └── SciencePanel.tsx         # Research tree with unlocks
└── ProbeDesigner.tsx        # Modal for custom blueprint creation
```

### UI Color Scheme

- **Metal**: Yellow (`yellow-400/500/800/900`) - Mining icons, inventory, progress bars, buttons
- **Plutonium**: Teal (`teal-400/500/800/900`) - Fuel, thrust, travel progress
- **Scanning**: Indigo (`indigo-400/500`) - Scan operations and range
- **Exploration**: Emerald (`emerald-400/500`) - Deep space travel, replication
- **Autonomy/AI**: Purple (`purple-400/500`) - AI systems and neural cores
- **Mining Speed**: Yellow (`yellow-400`) - Upgrade icon
- **Warnings**: Amber (`amber-400/500`) - Solar sailing, low resources, max levels

## Critical Game Mechanics

### Dual Navigation System

1. **Point-to-point travel**: Between known systems, deterministic path, pre-calculated fuel
2. **Vector exploration**: Free-flight with `heading` (0-360°), continuous fuel burn, triggers procedural generation

```typescript
// Traveling: linear interpolation between systems
progress += unitsTraveled / totalDist;
position = lerp(startSys.position, targetSys.position, progress);

// Exploring: continuous movement with heading
const rad = (heading * Math.PI) / 180;
position.x += Math.cos(rad) * speed * deltaTime;
```

### Procedural Universe Generation

- Universe divided into 1000×1000 sectors
- `GameState.generatedSectors` (Set) tracks visited sectors by key `"x,y"`
- Generation triggers when probe enters new sector (in `tick` during Exploring/Scanning)
- Systems generated with resource richness scaling by distance from Earth
- **Key**: Always check/add to `generatedSectors` when probes move

### Autonomy System

Probes with `stats.autonomyLevel > 0` execute AI logic in `tick()`:

1. **Priority 1**: Analyze/scan new arrivals
2. **Priority 2 (Level 2 only)**: Self-replicate if resources sufficient and `originSystemId !== locationId`
3. **Priority 3**: Navigate to nearest unvisited discovered system
4. **Fallback**: Random heading deep space exploration

**Critical safeguard**: `originSystemId` prevents infinite replication loops in same system

### Resource System

- **Mining**: Uses `miningBuffer` (float accumulator) for smooth progress, transfers to inventory when >= 1
- **Fuel consumption**:
  - Travel: `distance * FUEL_CONSUMPTION_RATE` (0.2 Pu/unit)
  - Turning: `degrees * TURN_COST_PER_DEGREE` (0.2 Pu/degree)
- **Solar Sailing**: Speed multiplier 0.05x when Plutonium = 0

### Science & Research

- Systems have finite `scienceRemaining` seeded by distance from Earth; consumed via Research.
- Probes set to `Researching` generate global `GameState.science` at `RESEARCH_RATE_BASE * scanSpeed` per second until the system's `scienceRemaining` is 0.
- Processor: `processResearchingProbe()` in `logic/gameLoop.ts` returns `scienceDelta` and `systemUpdates`.
- Handlers/UI: `handleResearch()` in `handlers/operationHandlers.ts`; button in `ProbesListPanel` under Extra Actions; science bank shown in Research Tree panel.

### Science Unlocks

- **Tech Tree**: 14 unlocks across 5 categories (mining, propulsion, sensors, fabrication, ai) defined in `SCIENCE_UNLOCKS` constant.
- **Three Tiers**: Tier 1 (500-800 sci), Tier 2 (1200-1800 sci), Tier 3 (2500-4000 sci).
- **Prerequisites**: Higher-tier unlocks require purchasing lower-tier unlocks first (e.g., "Quantum Excavation" requires "Advanced Drill Matrix").
- **Effect System**: Each unlock increases `maxStatLevelOverrides` in `GameState`, extending caps beyond base `MAX_STAT_LEVELS`.
  - Example: Mining Speed base max = 10, can reach 15/20/30 with unlocks.
- **State Tracking**: `GameState.purchasedUnlocks` (string array) and `GameState.maxStatLevelOverrides` (partial record).
- **Handler**: `handlePurchaseUnlock()` in `handlers/scienceHandlers.ts` validates cost/prerequisites and applies effects.
- **UI**: `SciencePanel.tsx` displays tech tree with category grouping, progress tracking, and purchase buttons. Accessed via Beaker tab in ControlPanel.
- **Integration**: Probe upgrade system (`probeHandlers.ts` and `ProbesListPanel.tsx`) uses dynamic max levels from `maxStatLevelOverrides`.

## Development Patterns

### Handler Pattern (User Actions)

Handlers in `handlers/` take `setGameState` and current `gameState`, perform validation, and update state:

```typescript
export const handleLaunch = (
  setGameState: SetGameState,
  gameState: GameState,
  targetSystemId: string
) => {
  // Validation
  const probe = gameState.probes.find(
    (p) => p.id === gameState.selectedProbeId
  );
  if (!probe || probe.state !== ProbeState.Idle) return;

  // Immutable state update
  setGameState((prev) => ({
    ...prev,
    probes: prev.probes.map((p) =>
      p.id === probe.id
        ? { ...p, state: ProbeState.Traveling, targetSystemId, progress: 0 }
        : p
    ),
    logs: [...prev.logs, `${probe.name} launched to ${targetSystem.name}`],
  }));
};
```

### Logic Pattern (Game Loop Processing)

Logic functions in `logic/` are pure - they take probe/state, return new probe + side effects:

```typescript
export interface StateUpdateResult {
  probe: Probe;              // Updated probe
  logMessages: string[];     // Messages to add to game log
  systemUpdates: Array<...>; // Systems to update
  newProbes: Probe[];        // Newly created probes (replication)
}

export const processTravelingProbe = (
  probe: Probe,
  systems: SolarSystem[],
  delta: number
): StateUpdateResult => {
  // Pure logic - no setGameState calls
  const updatedProbe = { ...probe, progress: probe.progress + delta };
  return { probe: updatedProbe, logMessages: [], systemUpdates: [], newProbes: [] };
};
```

**Game loop** (`App.tsx`) calls logic functions for each probe state, accumulates results, applies once:

```typescript
prev.probes.forEach((probe) => {
  if (probe.state === ProbeState.Traveling) {
    const result = processTravelingProbe(probe, systems, delta);
    updatedProbe = result.probe;
    newLogs.push(...result.logMessages);
    // ... accumulate systemUpdates
  }
});
// Single state update at end
return { ...prev, probes: finalProbes, logs: [...prev.logs, ...newLogs] };
```

### Adding New Probe States

1. Add enum value to `ProbeState` in `types.ts`
2. Create processor function in `logic/gameLoop.ts` (returns `StateUpdateResult`)
3. Call processor in `App.tsx` game loop `tick()` function
4. Add UI controls in `OperationsListPanel.tsx` or relevant panel
5. Add handler in `handlers/operationHandlers.ts` if user-initiated

### Adding New Upgradeable Stats

1. Add to `ProbeStats` interface in `types.ts`
2. Add entry to `UPGRADE_COSTS` in `constants.ts` with cost and increment
3. Add max level to `MAX_STAT_LEVELS` in `constants.ts`
4. Add UI row in `ProbesListPanel.tsx` `renderUpgradeRow()` calls
5. Upgrade handler in `probeHandlers.ts` automatically handles new stats

### Gemini Integration

- `geminiService.ts` uses `@google/genai` package
- API key injected via Vite's `define` from `.env.local` as `process.env.API_KEY`
- Used for system lore generation and probe naming
- Always gracefully degrade if `process.env.API_KEY` is undefined

## Constants & Balance (`constants.ts`)

- **Universe**: 2000×2000 base, infinite via sectors
- **Speeds**: Flight speed multiplied by stats, ~10 units/sec base
- **Upgrade Costs**: Defined in `UPGRADE_COSTS`, pattern: `{ Metal, Plutonium, increment, name }`
  - Cost scales with level: `cost = baseCost * (currentLevel + 1)`
  - Example: Level 0→1 costs 100M, Level 1→2 costs 200M, etc.
- **Max Stat Levels** (`MAX_STAT_LEVELS`):
  - Mining Speed: 10, Flight Speed: 10, Replication Speed: 5
  - Scan Range: 1000 LY, Scan Speed: 5x, Autonomy: 2
  - **Note**: These are base maximums; science unlocks can extend them via `GameState.maxStatLevelOverrides`
- **Science Unlocks** (`SCIENCE_UNLOCKS`): 14 unlocks in 3 tiers that increase max stat levels
  - Categories: mining, propulsion, sensors, fabrication, ai
  - Costs range from 500 to 4000 science
  - Prerequisites create tech tree progression

## Common Tasks

### Adding New Game Features

1. **Types**: Add/modify interfaces in `types.ts`
2. **Logic**: Create pure processor in `logic/gameLoop.ts` (returns `StateUpdateResult`)
3. **Handler**: Add user action handler in `handlers/` (calls `setGameState`)
4. **Game loop**: Wire processor into `App.tsx` `tick()` function
5. **UI**: Add controls to relevant component in `components/panels/`
6. **State**: Update `GameState` interface if adding persistent data
7. **Serialization**: Test save/export - ensure no functions/Sets (convert to arrays)

### Performance Considerations

- Game loop is O(n) for probes - tested stable up to ~100 probes
- `systems` array grows unbounded with exploration - consider virtualization if 2000+ systems
- Avoid expensive lookups in `tick()` - use Maps for O(1) access if searching frequently
- Conditional state updates: Only replace arrays/objects if changed to prevent re-renders

### Running & Building

```powershell
npm install          # Install dependencies
npm run dev          # Dev server on port 3000
npm run build        # Production build
```

- Requires `GEMINI_API_KEY` in `.env.local` for AI features
- Vite dev server includes HMR for fast iteration

## Anti-Patterns to Avoid

- ❌ Don't call `setGameState` in `logic/` functions - they must be pure (return updates)
- ❌ Don't call Gemini API in game loop (only in handlers on user actions)
- ❌ Don't mutate state directly - always use immutable patterns with spread operators
- ❌ Don't forget to update `generatedSectors` when adding sector logic
- ❌ Don't add new probe behavior without considering autonomy system interactions
- ❌ Don't use `&&` in PowerShell commands (use `;` for chaining)
- ❌ Don't mix handler patterns - handlers modify state, logic returns updates

## Save System

- Export: Serializes entire `GameState` to JSON (converts Set to Array)
- Import: Deserializes and validates, reconstructs Sets
- When adding new state properties, ensure they're serializable or excluded from save

## Maintaining These Instructions

**After making significant code changes, always review and update this file.**

Changes that require documentation updates:

- New architectural patterns or refactoring (handlers, logic, components)
- New game mechanics or probe states
- Changes to the game loop or state management patterns
- New development workflows or build processes
- New external dependencies or API integrations
- Changes to directory structure or file organization

Keep instructions actionable and specific to THIS codebase - avoid generic advice.

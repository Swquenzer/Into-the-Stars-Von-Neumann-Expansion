# Copilot Instructions: Von Neumann Expansion

## Project Overview

This is a React-based 2D space exploration/incremental strategy game where players control self-replicating Von Neumann probes. Built with React 19, TypeScript, Vite, and integrates Google Gemini API for procedural narrative generation.

## Architecture

### Monolithic State Pattern

- **`App.tsx` is the heart**: Contains game loop, state management, and ALL core logic (~700+ lines)
- Single `GameState` object manages systems, probes, blueprints, logs, UI state
- Game loop runs on `requestAnimationFrame` with delta-time calculations for frame-independent physics
- When modifying game logic, work in `App.tsx` - don't try to extract logic elsewhere without explicit request

### Type System (`types.ts`)

- **ProbeState enum**: 7 states (Idle, Mining\*, Traveling, Replicating, Scanning, Exploring)
- **Key interfaces**: `Probe`, `SolarSystem`, `ProbeStats`, `ProbeBlueprint`, `GameState`
- Probes track both discrete location (`locationId`) and continuous position (`{ x, y }`)
- Systems have 3 visibility states: `discovered` (on map), `visited` (probe arrived), `analyzed` (resources revealed)

### Component Structure

```
App.tsx (game loop + state)
├── StarMap.tsx (canvas rendering, pan/zoom, selection)
└── ControlPanel.tsx (tabbed UI container)
    └── panels/ (ProbesListPanel, SystemsListPanel, OperationsListPanel, LogsListPanel)
```

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

## Development Patterns

### State Updates

Always use immutable patterns - spread operators for nested updates:

```typescript
setGameState((prev) => ({
  ...prev,
  probes: prev.probes.map((p) => (p.id === targetId ? { ...p, newProp } : p)),
  systems: systemsChanged ? newSystems : prev.systems, // avoid unnecessary re-renders
  logs: [...prev.logs, newLog],
}));
```

### Adding New Probe States

1. Add enum value to `ProbeState` in `types.ts`
2. Add handler in `tick()` game loop in `App.tsx`
3. Add UI controls in relevant panel component
4. Update progress/buffer logic if state has duration

### Gemini Integration

- `geminiService.ts` uses `@google/genai` package
- API key injected via Vite's `define` from `.env.local` as `process.env.API_KEY`
- Used for system lore generation and probe naming
- Always gracefully degrade if `process.env.API_KEY` is undefined

## Constants & Balance (`constants.ts`)

- **Universe**: 2000×2000 base, infinite via sectors
- **Speeds**: Flight speed multiplied by stats, ~10 units/sec base
- **Costs**: Defined for upgrades (`UPGRADE_COSTS`) and blueprints
- When adding upgrades, follow pattern: `{ Metal, Plutonium, increment, name }`

## Common Tasks

### Adding New Game Features

1. Add types to `types.ts` if needed
2. Implement logic in `App.tsx` `tick()` or create handler function
3. Add UI controls in appropriate panel component
4. Update `GameState` structure if persisting new data
5. Test with save/export to ensure JSON serializability

### Performance Considerations

- Game loop is O(n) for probes - tested stable up to ~100 probes
- `systems` array grows unbounded with exploration - consider virtualization if 2000+ systems
- Avoid `semantic_search` on large generated arrays in `tick()` - use direct lookups

### Running & Building

```powershell
npm install          # Install dependencies
npm run dev          # Dev server on port 3000
npm run build        # Production build
```

- Requires `GEMINI_API_KEY` in `.env.local` for AI features
- Vite dev server includes HMR for fast iteration

## Anti-Patterns to Avoid

- ❌ Don't call Gemini API in game loop (only on user actions)
- ❌ Don't mutate state directly - always use `setGameState`
- ❌ Don't forget to update `generatedSectors` when adding sector logic
- ❌ Don't add new probe logic without considering autonomy system interactions
- ❌ Don't use `&&` in PowerShell commands (use `;` for chaining)

## Save System

- Export: Serializes entire `GameState` to JSON (converts Set to Array)
- Import: Deserializes and validates, reconstructs Sets
- When adding new state properties, ensure they're serializable or excluded from save

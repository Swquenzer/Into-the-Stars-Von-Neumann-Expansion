# Project Context: We Are Bob (Von Neumann Expansion)
Note: This file was generated from Gemini AIStudio based on the original prompts that created this app.

## 1. Project Overview
**Title:** We Are Bob: Von Neumann Expansion
**Type:** 2D Space Exploration / Incremental Strategy Game
**Tech Stack:** React (v19), TypeScript, Tailwind CSS, Google Gemini API.
**Core Premise:** The player controls a Von Neumann probe launched from Earth. The goal is to explore a procedurally generated universe, mine resources (Metal, Plutonium), replicate the probe, and expand the fleet using autonomous AI behaviors.

---

## 2. Development History & Evolution
This project evolved through an iterative chat-based development process. Below is a summary of the major milestones and logic shifts:

1.  **Foundation:** Established the loop of launching a probe, mining resources, and replicating.
2.  **UI Overhaul:** Moved from a basic layout to a tabbed **Control Panel** (Probes, Systems, Operations, Logs) and an interactive **Star Map** (Pan/Zoom/Select).
3.  **Mechanics Expansion:**
    *   **Mining:** Split into discrete operations (Mining Metal vs. Plutonium).
    *   **Travel:** Differentiated between "Traveling" (Node-to-Node) and "Exploring" (Vector-based deep space flight).
    *   **Fog of War:** Introduced "Discovered", "Visited", and "Analyzed" states. Systems must be analyzed to see resource yields.
4.  **Customization (The RPG Layer):**
    *   **Probe Designer:** Created a full-screen UI to design custom "Blueprints" by adjusting stats (Mining Speed, Flight Speed, Scan Range, Autonomy).
    *   **Upgrades:** Existing probes can purchase upgrades for their specific components using their own inventory.
5.  **Autonomy (The RTS Layer):**
    *   Introduced **AI Cores** (Adventurer and Replicator).
    *   Implemented a state machine (`manageAutonomousProbe`) allowing probes to act independently: Scanning upon arrival, mining fuel, replicating (if Replicator), and finding new targets.
    *   Added safeguards against infinite replication loops in a single system.
6.  **Procedural Universe:**
    *   Moved from a static list of 30 systems to an infinite **Sector-based generation** system.
    *   New systems are generated when a probe enters a previously unvisited spatial sector.
7.  **Quality of Life:**
    *   Save/Load functionality (JSON export/import).
    *   Deep Space vector adjustments with fuel cost calculations.
    *   Solar Sailing (Low power mode when fuel is empty).

---

## 3. Architecture & File Structure

### Entry Points
*   `index.tsx`: React entry point.
*   `App.tsx`: **The Monolith.** Contains the main game loop (`tick`), state management (`useState`), game logic handlers, and procedural generation algorithms.
*   `types.ts`: TypeScript definitions for all data models.
*   `constants.ts`: Source of truth for game balance (Costs, Speed, Map Size, Upgrades).

### Components (`/components`)
*   `StarMap.tsx`: Canvas/SVG visualization. Handles rendering systems, probes, vectors, scanner rings, and user interaction (Pan/Zoom).
*   `ControlPanel.tsx`: The main UI container. Manages tabs and state for sub-panels.
*   `ProbeDesigner.tsx`: Modal overlay for creating custom blueprints.
*   **Sub-Panels (`/components/panels`):**
    *   `ProbesListPanel.tsx`: List of units, specific unit details, upgrades, and deep space controls.
    *   `SystemsListPanel.tsx`: List of discovered systems, system details, analysis, and launch controls.
    *   `OperationsListPanel.tsx`: Real-time list of active tasks with progress bars.
    *   `LogsListPanel.tsx`: Scrolling mission log.

### Services
*   `services/geminiService.ts`: Integration with Google Gemini API to generate flavor text (System Lore) and cool probe names.

---

## 4. Core Mechanics & Logic

### A. The Game Loop (`tick` in `App.tsx`)
The game runs on `requestAnimationFrame`. It calculates a `delta` time since the last frame to ensure consistent movement and resource gathering speeds regardless of framerate.

### B. Probe States (`ProbeState`)
1.  **Idle:** Ready for commands or AI decision making.
2.  **Mining (Metal/Plutonium):** Accumulates resources into a `miningBuffer`. When buffer >= 1, inventory updates.
3.  **Replicating:** Consumes resources to build a new probe based on a `pendingBlueprint`.
4.  **Scanning:** Active sensor sweep. Upon completion, reveals hidden systems within `scanRange` and generates new sectors if near the edge.
5.  **Traveling:** Deterministic movement between two known `SolarSystem` nodes.
6.  **Exploring:** Vector-based movement (`x`, `y` coordinates + `heading`). Consumes fuel per tick. Triggers procedural generation.

### C. Autonomy System (`manageAutonomousProbe`)
Probes with `autonomyLevel > 0` run a logic check every tick:
1.  **Analyze/Scan:** If at a new system, map it immediately.
2.  **Replicate (Level 2 only):** If resources allow, and the system hasn't been colonized by this lineage, build a copy.
3.  **Exploration:** Find the nearest "Discovered but Unvisited" system.
    *   If fuel allows -> Launch.
    *   If no fuel -> Mine Plutonium.
4.  **Deep Space Fallback:** If no known targets exist, pick a random vector and launch into deep space to find new stars.

### D. Procedural Generation
*   **Spatial Hashing:** The universe is divided into `1000x1000` pixel Sectors.
*   **Tracking:** `GameState.generatedSectors` (Set<string>) tracks visited sectors (e.g., `"0,0"`, `"1,-2"`).
*   **Trigger:** When a probe's coordinates enter a sector not in the Set, `generateSystemsForSector` is called.
*   **Density:** Generates 0-3 systems per sector. Distance from Earth determines resource richness (further = richer, but harder to reach).

### E. Navigation & Fuel
*   **Point-to-Point:** Pre-calculates fuel cost. Solar Sails (5% speed) used if fuel is insufficient.
*   **Vector Flight:** Burns fuel continuously based on distance traveled.
*   **Turning:** Changing vector direction costs fuel (`TURN_COST_PER_DEGREE`).
*   **Safety Protocol:** Autonomous probes calculate the fuel required to return to the nearest "Safe Harbor". If reserves hit a critical threshold (plus safety margin), they auto-abort and return home.

---

## 5. Key Data Models

### Probe
```typescript
interface Probe {
  id: string;
  state: ProbeState;
  stats: ProbeStats; // (Speed, Range, Autonomy Level)
  inventory: { Metal: number, Plutonium: number };
  heading?: number; // For vector flight
  isAutonomyEnabled: boolean; // Toggle for AI
  originSystemId?: string; // To prevent infinite replication in one spot
  // ... other props
}
```

### SolarSystem
```typescript
interface SolarSystem {
  id: string;
  position: { x, y };
  resources: { Metal, Plutonium }; // Abundance (0-100)
  resourceYield: { Metal, Plutonium }; // Total remaining in ground
  analyzed: boolean; // Resources visible?
  discovered: boolean; // Visible on map?
}
```

---

## 6. Future Considerations for LLMs
If you are an LLM continuing this project, consider:
1.  **Performance:** `App.tsx` state is large. With 500+ probes, the `tick` function (O(n)) might slow down. React Virtualization for lists or moving logic to a Web Worker might be needed eventually.
2.  **Code Splitting:** `App.tsx` handles too much logic. Extracting the `tick` logic into a custom hook (e.g., `useGameLoop`) or a separate logic service class would be a good refactor.
3.  **Visuals:** The `StarMap` is SVG-based. If entity count exceeds 2000, migrating to HTML5 Canvas API (Context2D) or WebGL would improve rendering performance.

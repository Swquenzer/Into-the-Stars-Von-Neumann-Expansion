# Automated Probe Behaviors Feature Plan

## Feature Overview

Enhance the AI probe system with configurable behavior modes that allow probes to autonomously focus on specific tasks: mining resources, exploring new systems, or extracting science points.

**Default Behavior (No Modules):**
When autonomy is enabled but no behavior module is installed, probes will automatically alternate between mining Metal and Plutonium at their current location. This provides basic resource gathering without exploration.

## Core Requirements

### Behavior Modes (Radio Button Selection)

Users can select ONE active behavior mode per probe (requires corresponding module installation):

1. **Focus Mining**

   - Autonomously extract Metal and Plutonium from systems
   - Continue until resources are depleted
   - Move to next resource-rich system when complete

2. **Focus Exploring**

   - Move from system to system
   - Prioritize scanning and identifying new systems
   - Map uncharted sectors

3. **Focus Science**
   - Target systems with remaining science points
   - Automatically deploy relay stations
   - Extract all available science before moving on

### Unlock System

**Science Tree Unlocks:**

- New AI section in research tree
- Each behavior requires a specific science unlock
- Unlocks are account-wide (all probes can use once researched)

**Probe Module Installation:**

- After science unlock, modules must be installed per-probe
- Installation costs resources (Metal/Plutonium)
- Only installed modules appear as selectable options

### UI Integration

**Probe Details Panel:**

- Dedicated "AI Core Systems" section (collapsible)
- Radio button list showing available behaviors
- Locked behaviors show requirements/tooltips
- Visual indicator of current active mode

**AI Control Panel Section:**

Dedicate a collapsible section in the probe details with:

```
┌─ AI CORE SYSTEMS ─────────────────┐
│ Status: Active                     │
│ Current Mode: [Focus Science]      │
│ Autonomy Level: 2                  │
│                                    │
│ Available Behaviors:               │
│ ○ Focus Mining                     │
│ ● Focus Exploring (active)         │
│ ○ Focus Science [Locked]           │
│                                    │
│ Behavior Settings:                 │
│ ☑ Auto-refuel when low            │
│ ☑ Return when inventory full       │
│ ☐ Deploy relays automatically      │
└────────────────────────────────────┘
```

**Behavior History/Log:**

Show a mini-log of recent AI decisions:

- "Chose Wolf 359 over Alpha Centauri (closer)"
- "Skipped depleted system Proxima"
- "Diverted to refuel at Earth"

---

## Advanced Features

### 5. Fleet Coordination (if multiple AI probes)

- **Avoid Redundancy**: Probes share discovered targets and don't duplicate efforts
- **Division of Labor**: Automatically assign different roles to different probes
- Example: "Focus Exploring" probes won't target systems already being mined by "Focus Mining" probes

### 6. Smart Pathing

- Consider fuel efficiency when choosing next target
- Prefer closer systems over distant ones (unless specifically overridden)
- Factor in relay network coverage for longer journeys

### 7. Conditional Behaviors

Advanced users could set rules like:

- "Focus Mining UNTIL inventory >500 Metal, THEN Focus Science"
- "Focus Exploring ONLY in unexplored sectors"

### 8. Behavior Presets/Templates

Save and load behavior configurations:

- "Deep Space Explorer" preset
- "Resource Harvester" preset
- "Science Vessel" preset

---

## Science Tree Integration

### 11. Tiered AI Unlocks

Structure the AI research tree with prerequisites:

```
AI Foundations (Tier 1)
├─ Basic Autonomy (already exists)
└─ AI Behavior Protocols (new)
    └─ Unlocks behavior selection

Resource AI (Tier 2)
├─ Focus Mining Module (requires AI Behavior Protocols)
└─ Smart Inventory Management

Exploration AI (Tier 2)
├─ Focus Exploring Module
└─ Advanced Navigation Algorithms

Science AI (Tier 3)
├─ Focus Science Module (requires Focus Exploring)
└─ Autonomous Relay Deployment

Fleet AI (Tier 4 - Advanced)
├─ Multi-Probe Coordination
└─ Swarm Intelligence
```

### 12. Module Installation Cost

After unlocking via science, make each module require resources to install on individual probes:

- Focus Mining: 150 Metal
- Focus Exploring: 100 Metal, 50 Plutonium
- Focus Science: 200 Metal, 100 Plutonium

This creates meaningful choices about which probes get which upgrades.

---

## Quality of Life

### 13. Behavior Performance Metrics

Track and display stats per probe:

- Total Metal mined
- Systems discovered
- Science points generated
- Efficiency rating

### 14. Emergency Override

Allow manual control to temporarily override AI behavior without disabling it:

- "Manual mode until next system arrival"
- Then resume AI behavior

### 15. Behavior Validation

Prevent user errors:

- Gray out unavailable behaviors
- Show tooltips explaining why locked ("Requires: Quantum Computing Research")
- Warning when changing behavior mid-operation

---

## Implementation Priority

### Phase 1 (MVP)

- Radio button behavior selection
- Three basic behaviors (Mining, Exploring, Science)
- Science tree unlocks
- UI section in probe details

### Phase 2 (Enhancement)

- Behavior thresholds/settings
- Status indicators
- Return home behavior

### Phase 3 (Advanced)

- Priority system (primary/secondary)
- Fleet coordination
- Performance metrics

---

## Technical Considerations

### Data Structure Changes

**Probe Interface Updates:**

```typescript
interface Probe {
  // ... existing fields
  aiBehavior?: AIBehavior;
  aiModules: AIModule[];
  aiSettings?: AIBehaviorSettings;
}

enum AIBehavior {
  None = "none",
  FocusMining = "focus_mining",
  FocusExploring = "focus_exploring",
  FocusScience = "focus_science",
}

interface AIModule {
  type: AIBehavior;
  installedAt: number;
}

interface AIBehaviorSettings {
  inventoryThreshold?: number;
  scienceMinimum?: number;
  autoRefuel?: boolean;
  returnWhenFull?: boolean;
  autoDeployRelays?: boolean;
}
```

**GameState Updates:**

```typescript
interface GameState {
  // ... existing fields
  unlockedAIBehaviors: AIBehavior[];
}
```

### Logic Files to Modify/Create

1. **logic/aiBehaviorSystem.ts** (new)

   - Behavior-specific decision trees
   - Target selection algorithms
   - Behavior state validation

2. **logic/autonomySystem.ts** (modify)

   - Replace existing exploration/replication logic with behavior system
   - Default behavior: alternate between mining Metal and Plutonium
   - Call behavior-specific handlers when modules are installed

3. **handlers/aiBehaviorHandlers.ts** (new)
   - Set behavior mode
   - Install/uninstall modules
   - Update behavior settings

### Constants to Add

```typescript
// AI Behavior Costs
export const AI_MODULE_COSTS = {
  focus_mining: { Metal: 150, Plutonium: 0 },
  focus_exploring: { Metal: 200, Plutonium: 75 },
  focus_science: { Metal: 300, Plutonium: 50 },
};

// Science Unlocks
export const AI_BEHAVIOR_UNLOCKS = {
  ai_behavior_protocols: {
    cost: 50,
    name: "AI Behavior Protocols",
    category: "ai",
    tier: 1,
  },
  focus_mining_module: {
    cost: 150,
    prerequisites: ["ai_behavior_protocols"],
    name: "Focus Mining Module",
    category: "ai",
    tier: 2,
  },
  // ... etc
};
```

---

## Open Questions / Design Decisions

1. Should behavior mode persist through save/load? **Yes**
2. How should behavior interact with manual override commands? **Manual commands should temporarily pause AI behavior until probe returns to Idle**
3. Should there be a global "pause all AI" button? **Out of scope for Phase 1**
4. What happens if a probe with "Focus Science" runs out of science targets? **Falls back to default mining behavior**
5. Should behavior changes have a cooldown to prevent rapid switching? **No cooldown needed**
6. How do behaviors interact with the existing autonomyLevel system? **Behaviors replace the existing exploration/replication logic. Default behavior (mine Metal/Plutonium) only requires autonomyLevel 1. Behavior modules require autonomyLevel 2.**

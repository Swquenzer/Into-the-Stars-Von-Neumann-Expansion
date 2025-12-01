Scope

- Add per-system storage for Metal and Plutonium with capacity.
- Build a Storage Facility at a system (cost + requirements).
- Transfer resources between a docked probe and the system storage (deposit/withdraw).
- Keep v1 manual; consider autonomy usage in a later phase.

Data Model

- Storage facility (dedicated object):
  - Define `StorageFacility`: `{ Metal: number; Plutonium: number; capacity: number }`.
  - Created when a facility is built and persists on the system.
- Solar system linkage:
  - Add `storageFacility?: StorageFacility` to `SolarSystem` (undefined when none exists).
  - Remove the embedded `storage` shape; use the dedicated object instead.

Constants

- `STORAGE_CAPACITY_BASE`: base capacity per facility (e.g., 2000 units).
- `STORAGE_BUILD_COST`: `{ Metal: 600, Plutonium: 100 }` (tuneable).
- `TRANSFER_RATE_MAX`: max per action (e.g., 500 units), or allow user-entered amounts.
- `SCIENCE_UNLOCK_IDS.PLANETARY_LOGISTICS`: science unlock required to build a storage facility.

Handlers

- File: `handlers/storageHandlers.ts`:
  - `handleBuildStorageFacility(setGameState, gameState)`: requires `PLANETARY_LOGISTICS` unlock; probe must be Idle and docked; deduct cost; create `storageFacility` object on the system with base capacity.
  - `handleDepositToStorage(setGameState, gameState, amount, resourceType)`: validation (Idle, docked, `storageFacility` exists), clamp to probe inventory and remaining capacity.
  - `handleWithdrawFromStorage(setGameState, gameState, amount, resourceType)`: validation (Idle, docked, `storageFacility` exists), clamp to system facility available.
- Logging: append concise log entries for actions and failures.

Wiring

- `App.tsx`: Create wrapper functions and pass them to `ControlPanel` props.
- Ensure handlers use immutable updates and follow existing patterns.

UI

- `SystemsListPanel.tsx`:
  - Display storage cards/bars from `storageFacility` (current vs capacity for Metal and Plutonium).
  - Show “Build Storage Facility” when: docked, Idle, resources available, no `storageFacility`, and `PLANETARY_LOGISTICS` unlock purchased; include tooltips for disabled reasons (no unlock, not docked, insufficient resources).
- `ProbesListPanel.tsx`:
  - When probe Idle and docked at a system with `storageFacility`: show Deposit/Withdraw controls.
  - Simple amount input (number) with quick-action buttons (e.g., 25%, 50%, MAX), per resource.
  - Validation messages inline (e.g., “Insufficient storage capacity”, “No facility”).

Save/Load

- `saveHandlers.ts`: Ensure `SolarSystem.storageFacility` serializes; handle backward compatibility (default to `undefined` and treat as no facility).

Optional Unlock

- `SCIENCE_UNLOCKS`: Add “Planetary Logistics” (cost ~800 science, no prereq or minor prereq).
- Gate “Build Storage Facility” behind this unlock (required). Transfers are allowed once a facility exists; optionally gate transfers later if desired.
- Integrate with `handlePurchaseUnlock` and check `purchasedUnlocks` in build handler/UI.

Phase 2: Autonomy

- Rules: probes auto-deposit surplus Metal, withdraw Plutonium for travel; avoid overfilling storage; respect relay unlocks for logistics scaling.
- Throttle checks — evaluate on arrival and after mining batches, not every tick.

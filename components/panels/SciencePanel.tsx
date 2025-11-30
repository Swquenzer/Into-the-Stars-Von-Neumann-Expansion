import React, { useMemo } from "react";
import { GameState } from "../../types";
import {
  SCIENCE_UNLOCKS,
  CATEGORY_COLORS,
  ScienceUnlock,
} from "../../constants";
import { Beaker, Lock, CheckCircle2, ArrowRight } from "lucide-react";

export interface SciencePanelProps {
  gameState: GameState;
  onPurchaseUnlock: (unlockId: string) => void;
}

export const SciencePanel: React.FC<SciencePanelProps> = ({
  gameState,
  onPurchaseUnlock,
}) => {
  const { science, purchasedUnlocks } = gameState;

  // Group unlocks by category and tier
  const unlocksByCategory = useMemo(() => {
    const grouped: Record<string, ScienceUnlock[]> = {
      mining: [],
      propulsion: [],
      sensors: [],
      fabrication: [],
      ai: [],
    };
    SCIENCE_UNLOCKS.forEach((unlock) => {
      grouped[unlock.category].push(unlock);
    });
    return grouped;
  }, []);

  const isPurchased = (unlockId: string) => purchasedUnlocks.includes(unlockId);

  const canPurchase = (unlock: ScienceUnlock) => {
    if (isPurchased(unlock.id)) return false;
    if (science < unlock.cost) return false;
    if (unlock.prerequisites) {
      return unlock.prerequisites.every((prereqId) => isPurchased(prereqId));
    }
    return true;
  };

  const isLocked = (unlock: ScienceUnlock) => {
    if (isPurchased(unlock.id)) return false;
    if (unlock.prerequisites) {
      return !unlock.prerequisites.every((prereqId) => isPurchased(prereqId));
    }
    return false;
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-hidden w-full">
      <div className="p-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center flex-none">
        <h2 className="text-emerald-400 font-bold text-sm flex items-center gap-2">
          <Beaker size={16} /> RESEARCH TREE
        </h2>
        <div className="text-xs text-emerald-300 font-mono font-bold">
          {Math.floor(science)} Science
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">
        {(Object.entries(unlocksByCategory) as [string, ScienceUnlock[]][]).map(
          ([category, unlocks]) => {
            if (unlocks.length === 0) return null;
            const colors =
              CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];
            const purchasedCount = unlocks.filter((u) =>
              isPurchased(u.id)
            ).length;

            return (
              <div key={category} className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className={`text-xs font-bold uppercase ${colors.text}`}>
                    {category}
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    {purchasedCount}/{unlocks.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {unlocks.map((unlock) => {
                    const purchased = isPurchased(unlock.id);
                    const locked = isLocked(unlock);
                    const affordable = canPurchase(unlock);

                    return (
                      <div
                        key={unlock.id}
                        className={`p-2 rounded border transition-all ${
                          purchased
                            ? `${colors.bg} ${colors.border} opacity-60`
                            : locked
                            ? "bg-slate-950/50 border-slate-800 opacity-40"
                            : affordable
                            ? `${colors.bg} ${colors.border} hover:brightness-110`
                            : `${colors.bg} ${colors.border} opacity-70`
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span
                                className={`text-xs font-bold ${colors.text}`}
                              >
                                {unlock.name}
                              </span>
                              {purchased && (
                                <CheckCircle2
                                  size={12}
                                  className="text-emerald-400"
                                />
                              )}
                              {locked && (
                                <Lock size={10} className="text-slate-600" />
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 leading-tight">
                              {unlock.description}
                            </p>
                          </div>
                          {!purchased && (
                            <button
                              onClick={() => onPurchaseUnlock(unlock.id)}
                              disabled={!affordable}
                              className={`ml-2 px-2 py-1 rounded text-[10px] font-bold transition-colors flex items-center gap-1 flex-none ${
                                affordable
                                  ? `${colors.bg} ${colors.border} ${colors.text} hover:brightness-125 border`
                                  : "bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed border"
                              }`}
                            >
                              {affordable ? (
                                <>
                                  <ArrowRight size={10} />
                                  {unlock.cost}
                                </>
                              ) : (
                                <>{unlock.cost}</>
                              )}
                            </button>
                          )}
                        </div>

                        {unlock.prerequisites &&
                          unlock.prerequisites.length > 0 && (
                            <div className="text-[9px] text-slate-500 mt-1 flex items-center gap-1">
                              Requires:{" "}
                              {unlock.prerequisites.map((prereqId, idx) => {
                                const prereq = SCIENCE_UNLOCKS.find(
                                  (u) => u.id === prereqId
                                );
                                const prereqPurchased = isPurchased(prereqId);
                                return (
                                  <span
                                    key={prereqId}
                                    className={
                                      prereqPurchased
                                        ? "text-emerald-400"
                                        : "text-amber-400"
                                    }
                                  >
                                    {prereq?.name}
                                    {idx < unlock.prerequisites!.length - 1 &&
                                      ", "}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};

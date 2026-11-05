// Ігрові події для аналітики й інтерфейсу. Етап 12 підписується на них через track().
export const GAME_EVENTS = {
  levelStart: "game:level_start",
  death: "game:death",
  checkpoint: "game:checkpoint",
  levelComplete: "game:level_complete",
  qualityDowngrade: "game:quality_downgrade",
  qualityChanged: "game:quality_changed",
  overlayAction: "game:overlay_action",
} as const;

export type DeathCause = "fire" | "fall" | "enemy";

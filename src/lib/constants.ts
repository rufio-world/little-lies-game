export const PLAYER_INACTIVITY_LIMIT_MS = 2 * 60 * 1000; // 2 minutes

export const getPlayerInactivityCutoff = () =>
  new Date(Date.now() - PLAYER_INACTIVITY_LIMIT_MS).toISOString();

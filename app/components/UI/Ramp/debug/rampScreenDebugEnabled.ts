/**
 * Opt-in Ramp screen debug navigation (Token Selection chips, fake orders, modals).
 *
 * Set `MM_RAMPS_SCREEN_DEBUG_NAV=true` in `.js.env` (or your Expo env) for one-off
 * dev builds. Not tied to `__DEV__` so custom Expo env builds can enable it explicitly.
 */
export function isRampScreenDebugNavEnabled(): boolean {
  return process.env.MM_RAMPS_SCREEN_DEBUG_NAV === 'true';
}

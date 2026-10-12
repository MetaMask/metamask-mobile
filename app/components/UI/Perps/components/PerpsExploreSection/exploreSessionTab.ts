import type { ExploreTabId } from './PerpsExploreSection.types';

/**
 * In-memory tab selection for the current app process.
 * Survives leaving and re-entering Perps home. Cleared when the app process
 * ends, so the watchlist/crypto default applies again on the next launch.
 */
let sessionExploreTab: ExploreTabId | null = null;

export function readExploreSessionTab(): ExploreTabId | null {
  return sessionExploreTab;
}

export function writeExploreSessionTab(tab: ExploreTabId): void {
  sessionExploreTab = tab;
}

export function clearExploreSessionTab(): void {
  sessionExploreTab = null;
}

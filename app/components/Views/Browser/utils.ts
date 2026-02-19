import type { BrowserTab } from './Browser.types';

/**
 * Returns the IDs of the tabs that should be mounted (have a live WebView).
 * The active tab is always included. The rest are sorted by lastActiveAt
 * descending (most recently activated first) and we take the first
 * `maxMounted` total.
 */
export function getMountedTabIds(
  tabs: BrowserTab[],
  activeTabId: number | null,
  maxMounted: number,
): Set<number> {
  const sorted = [...tabs].sort(
    (a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0),
  );

  const mounted = sorted.slice(0, maxMounted);

  // Ensure the active tab is always in the set even if it somehow
  // doesn't have the highest lastActiveAt (e.g. legacy tabs without the field).
  if (activeTabId != null) {
    const hasActive = mounted.some((tab) => tab.id === activeTabId);
    if (!hasActive) {
      // Replace the last entry with the active tab
      const activeTab = tabs.find((tab) => tab.id === activeTabId);
      if (activeTab) {
        if (mounted.length >= maxMounted) {
          mounted[mounted.length - 1] = activeTab;
        } else {
          mounted.push(activeTab);
        }
      }
    }
  }

  return new Set(mounted.map((tab) => tab.id));
}

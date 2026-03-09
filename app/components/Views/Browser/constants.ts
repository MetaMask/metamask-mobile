export const IDLE_TIME_MAX = 1000 * 60 * 2.5; // 2.5 minutes
export const IDLE_TIME_CALC_INTERVAL = 1000 * 30; // 30 seconds

/**
 * Maximum number of browser tabs a user can have open at once.
 */
export const MAX_BROWSER_TABS = 20;

/**
 * Maximum number of tabs that are mounted (live WebView in memory) at any time.
 * The rest are unmounted with their URL and screenshot saved.
 */
export const MAX_MOUNTED_TABS = 5;

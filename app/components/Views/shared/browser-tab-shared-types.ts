/**
 * Shared props that are common to both BrowserTab and DiscoveryTab
 */
export interface SharedTabProps {
  /**
   * Function to update the tab information
   */
  showTabs: () => void;
  /**
   * Function to open a new tab
   */
  newTab: (url?: string) => void;
}

/**
 * Tab info update parameters
 */
export interface TabInfo {
  url?: string;
  isArchived?: boolean;
  image?: string;
}

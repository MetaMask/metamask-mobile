/**
 * Shared props that are common to both BrowserTab and DiscoveryTab
 */
export interface SharedTabProps {
  /**
   * The ID of the current tab
   */
  id: number;

  /**
   * Function to show the tabs view
   */
  showTabs: () => void;

  /**
   * Function to create a new tab
   */
  newTab: (url?: string, linkType?: string) => void;

  /**
   * Function to update the tab information
   */
  updateTabInfo: (
    tabID: number,
    info: { url?: string; isArchived?: boolean; image?: string },
  ) => void;
}

/**
 * Tab info update parameters
 */
export interface TabInfo {
  url?: string;
  isArchived?: boolean;
  image?: string;
}

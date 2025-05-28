/**
 * Shared props that are common to both BrowserTab and DiscoveryTab
 */
export interface SharedTabProps {
  /**
   * The ID of the current tab
   */
  id: number;
  /**
   * Function to open a new tab
   */
  newTab: (url?: string) => void;
  /**
   * Function to update the tab information
   */
  showTabs: () => void;
  /**
   * Function to update the tab information
   */
  updateTabInfo: (tabID: number, info: { url?: string; isArchived?: boolean; image?: string }) => void;
  /**
   * Represents the current chain id
   */
  activeChainId: string;
  /**
   * Boolean indicating if browser is in tabs view
   */
  isInTabsView: boolean;
}

/**
 * Tab info update parameters
 */
export interface TabInfo {
  url?: string;
  isArchived?: boolean;
  image?: string;
}

/**
 * Function type for updating tab information
 */
export type UpdateTabInfoFunction = (tabID: number, info: TabInfo) => void;

/**
 * Function type for opening a new tab
 */
export type NewTabFunction = (url?: string) => void;

/**
 * Function type for showing tabs
 */
export type ShowTabsFunction = () => void;

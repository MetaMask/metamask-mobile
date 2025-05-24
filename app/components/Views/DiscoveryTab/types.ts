/**
 * The props for the DiscoveryTab component
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DiscoveryTabProps = {
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
  updateTabInfo: (tabID: number, info: { url?: string, isArchived?: boolean, image?: string }) => void;
  /**
   * Represents the current chain id
   */
  activeChainId: string;
  /**
   * Boolean indicating if browser is in tabs view
   */
  isInTabsView: boolean;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type IpfsContentResult = {
  url?: string;
  hash?: string;
  type?: string;
  reload?: boolean;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SessionENSNames = {
  [key: string]: {
    hostname: string;
    hash: string;
    type: string;
  };
};

export enum WebViewNavigationEventName {
  OnLoadEnd,
  OnLoadProgress,
  OnLoadStart,
}

/**
 * The props for the BrowserTab component
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BrowserTabProps = {
  /**
   * The ID of the current tab
   */
  id: number;
  /**
   * The ID of the active tab
   */
  activeTab: number;
  /**
   * InitialUrl
   */
  initialUrl: string;
  /**
   * linkType - type of link to open
   */
  linkType?: string;
  /**
   * Protocol string to append to URLs that have none
   */
  defaultProtocol: string;
  /**
   * A string that of the chosen ipfs gateway
   */
  ipfsGateway: string;
  /**
   * Object containing the information for the current transaction
   */
  transaction?: Record<string, unknown>;
  /**
   * A string that represents the selected address
   */
  selectedAddress: string | undefined; // This should never be undefined, need to fix the accounts controller selector
  /**
   * Url coming from an external source
   * For ex. deeplinks
   */
  url?: string;
  /**
   * Function to open a new tab
   */
  newTab: (url?: string) => void;
  /**
   * Function to store bookmarks
   */
  addBookmark: (bookmark: { name: string; url: string }) => void;
  /**
   * Array of bookmarks
   */
  bookmarks: { name: string; url: string }[];
  /**
   * String representing the current search engine
   */
  searchEngine: string;
  /**
   * Function to store the a page in the browser history
   */
  addToBrowserHistory: (entry: { url: string; name: string }) => void;
  /**
   * Function to store the a website in the browser whitelist
   */
  addToWhitelist: (url: string) => void;
  /**
   * Function to update the tab information
   */
  updateTabInfo: (url: string, tabID: number) => void;
  /**
   * Function to update the tab information
   */
  showTabs: () => void;
  /**
   * Current onboarding wizard step
   */
  wizardStep: number;
  /**
   * the current version of the app
   */
  app_version?: string;
  /**
   * Represents ipfs gateway toggle
   */
  isIpfsGatewayEnabled: boolean;
  /**
   * Represents the current chain id
   */
  activeChainId: string;
  /**
   * Boolean indicating if browser is in tabs view
   */
  isInTabsView: boolean;
  /**
   * Home page url that is appended with metricsEnabled and marketingEnabled
   */
  homePageUrl: string;
};
// This event should be exported from the webview package
export interface WebViewErrorEvent {
  domain?: string;
  code: number;
  description: string;
}

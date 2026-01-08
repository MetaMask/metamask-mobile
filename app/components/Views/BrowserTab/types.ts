import { SharedTabProps } from '../shared/browser-tab-shared-types';

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
 * Extends shared props and adds browser-specific properties
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type BrowserTabProps = SharedTabProps & {
  /**
   * Function to open a new tab
   */
  newTab: (url?: string) => void;
  /**
   * Represents the current chain id
   */
  activeChainId: string;
  /**
   * Boolean indicating if browser is in tabs view
   */
  isInTabsView: boolean;
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
   * the current version of the app
   */
  app_version?: string;
  /**
   * Represents ipfs gateway toggle
   */
  isIpfsGatewayEnabled: boolean;
  /**
   * Home page url that is appended with metricsEnabled and marketingEnabled
   */
  homePageUrl: string;
  /**
   * Whether browser was opened from trending view
   */
  fromTrending?: boolean;
  /**
   * Whether browser was opened from Perps view
   */
  fromPerps?: boolean;

  /**
   * Boolean indicating if browser is in fullscreen mode
   */
  isFullscreen: boolean;
  /**
   * Function to toggle fullscreen mode
   */
  toggleFullscreen: (isFullscreen: boolean) => void;
};
// This event should be exported from the webview package
export interface WebViewErrorEvent {
  domain?: string;
  code: number;
  description: string;
}

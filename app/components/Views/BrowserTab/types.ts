export interface IpfsContentResult {
  url?: string;
  hash?: string;
  type?: string;
  reload?: boolean;
}

export type SessionENSNames = {
  [key: string]: {
    hostname: string;
    hash: string;
    type: string;
  };
};

/**
 * The props for the BrowserTab component
 */
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
  initialUrl?: string;
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
   * react-navigation object used to switch between screens
   */
  navigation: any; // Consider using proper react-navigation types
  /**
   * A string that represents the selected address
   */
  selectedAddress: string;
  /**
   * whitelisted url to bypass the phishing detection
   */
  whitelist: string[];
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
  bookmarks: Array<{ name: string; url: string }>;
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
   * Action to set onboarding wizard step
   */
  setOnboardingWizardStep: (step: number) => void;
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
  chainId: string;
  /**
   * Boolean indicating if browser is in tabs view
   */
  isInTabsView: boolean;
};

/**
 * Interface for tab components that expose a refresh method.
 * Used by WalletTokensTabView to call refresh on the active tab.
 */
export interface TabRefreshHandle {
  refresh: () => Promise<void>;
}

/**
 * Interface for WalletTokensTabView ref that exposes refresh method.
 * Used by Wallet component to trigger refresh on pull-to-refresh.
 */
export interface WalletTokensTabViewHandle {
  /**
   * Refreshes both shared content (balance) and the active tab's content.
   * @param refreshSharedContent - Function to refresh shared content (balance/rates).
   */
  refresh: (refreshSharedContent: () => Promise<void>) => Promise<void>;
}

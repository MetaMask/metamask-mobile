/**
 * Interface for tab components that expose a refresh method.
 * Used by Tokens and NftGrid in full-view flows.
 */
export interface TabRefreshHandle {
  refresh: () => Promise<void>;
}

/**
 * Interface for tab components that expose a refresh method.
 * Used by Tokens, NftGrid, and PredictTabView in full-view flows.
 */
export interface TabRefreshHandle {
  refresh: () => Promise<void>;
}

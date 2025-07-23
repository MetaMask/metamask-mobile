/**
 * Card feature state types
 */
export interface CardState {
  cardholderAccounts: string[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  sdkInitialized: boolean;
}

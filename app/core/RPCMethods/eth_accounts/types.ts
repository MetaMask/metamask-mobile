/**
 * Implementations used by eth_accounts handler
 */
export interface EthAccountHooks {
  getAccounts: () => string[];
}

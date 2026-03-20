/**
 * IDs for web elements in the Solana Test Dapp
 */
export interface SolanaTestDappWebIDs {
  WALLET_BUTTON: string;
}

/**
 * Web element IDs for the Multichain Test Dapp
 */
export const SolanaTestDappSelectorsWebIDs: SolanaTestDappWebIDs = {
  WALLET_BUTTON: '.wallet-adapter-modal-list .wallet-adapter-button', // Important space between classes to indicate a parent-child relationship
};

/**
 * Timeout constants for solana tests
 */
export const SOLANA_TEST_TIMEOUTS = {
  CONNECTION: 2000,
  DEFAULT_DELAY: 2000,
  METHOD_INVOCATION: 3000,
  ELEMENT_VISIBILITY: 5000,
};

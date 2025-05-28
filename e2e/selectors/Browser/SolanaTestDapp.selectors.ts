/**
 * IDs for web elements in the Solana Test Dapp
 */
export interface SolanaTestDappWebIDs {
  WALLET_BUTTON_SELECTOR: string;
}

/**
 * Web element IDs for the Multichain Test Dapp
 */
export const SolanaTestDappSelectorsWebIDs: SolanaTestDappWebIDs = {
  WALLET_BUTTON_SELECTOR: '.wallet-adapter-modal-list .wallet-adapter-button', // Space between classes indicates parent-child relationship: find button inside modal list
};

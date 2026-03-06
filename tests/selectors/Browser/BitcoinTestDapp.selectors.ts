/**
 * IDs for web elements in the Bitcoin Test Dapp
 */
export interface BitcoinTestDappWebIDs {
  WALLET_BUTTON: string;
  CONFIRM_SIGN_MESSAGE_BUTTON: string;
}

/**
 * Web element IDs for the Bitcoin Test Dapp
 */
export const BitcoinTestDappSelectorsWebIDs: BitcoinTestDappWebIDs = {
  WALLET_BUTTON: '.wallet-adapter-modal-list .wallet-adapter-button', // Important space between classes to indicate a parent-child relationship
  CONFIRM_SIGN_MESSAGE_BUTTON: 'confirmation-confirm-snap-footer-button',
};

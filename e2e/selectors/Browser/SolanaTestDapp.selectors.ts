/**
 * IDs for web elements in the Solana Test Dapp
 */
export interface SolanaTestDappWebIDs {
  WALLET_BUTTON_SELECTOR: string;
  CONFIRM_TRANSACTION_BUTTON_SELECTOR: string;
  CANCEL_TRANSACTION_BUTTON_SELECTOR: string;
  CONFIRM_SIGN_MESSAGE_BUTTON_SELECTOR: string;
  CANCEL_SIGN_MESSAGE_BUTTON_SELECTOR: string;
}

/**
 * Web element IDs for the Multichain Test Dapp
 */
export const SolanaTestDappSelectorsWebIDs: SolanaTestDappWebIDs = {
  WALLET_BUTTON_SELECTOR: '.wallet-adapter-modal-list .wallet-adapter-button', // Space between classes indicates parent-child relationship: find button inside modal list
  CONFIRM_TRANSACTION_BUTTON_SELECTOR:
    'confirm-sign-and-send-transaction-confirm-snap-footer-button',
  CANCEL_TRANSACTION_BUTTON_SELECTOR:
    'confirm-sign-and-send-transaction-cancel-snap-footer-button',
  CONFIRM_SIGN_MESSAGE_BUTTON_SELECTOR:
    'confirm-sign-message-confirm-snap-footer-button',
  CANCEL_SIGN_MESSAGE_BUTTON_SELECTOR:
    'confirm-sign-message-cancel-snap-footer-button',
};

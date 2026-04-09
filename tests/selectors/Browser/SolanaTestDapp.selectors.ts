/**
 * IDs for web elements in the Solana Test Dapp
 */
export interface SolanaTestDappWebIDs {
  WALLET_BUTTON: string;
  CONFIRM_TRANSACTION_BUTTON: string;
  CANCEL_TRANSACTION_BUTTON: string;
  CONFIRM_SIGN_MESSAGE_BUTTON: string;
  CANCEL_SIGN_MESSAGE_BUTTON: string;
}

/**
 * Web element IDs for the Multichain Test Dapp
 */
export const SolanaTestDappSelectorsWebIDs: SolanaTestDappWebIDs = {
  WALLET_BUTTON: '.wallet-adapter-modal-list .wallet-adapter-button', // Important space between classes to indicate a parent-child relationship
  CONFIRM_TRANSACTION_BUTTON:
    'confirm-sign-and-send-transaction-confirm-snap-footer-button',
  CANCEL_TRANSACTION_BUTTON:
    'confirm-sign-and-send-transaction-cancel-snap-footer-button',
  CONFIRM_SIGN_MESSAGE_BUTTON:
    'confirm-sign-message-confirm-snap-footer-button',
  CANCEL_SIGN_MESSAGE_BUTTON: 'confirm-sign-message-cancel-snap-footer-button',
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

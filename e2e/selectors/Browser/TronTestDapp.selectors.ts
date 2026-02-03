/**
 * IDs for web elements in the Tron Test Dapp
 */
export interface TronTestDappWebIDs {
  WALLET_BUTTON: string;
  DISCONNECT_BUTTON: string;
  CONFIRM_TRANSACTION_BUTTON: string;
  CANCEL_TRANSACTION_BUTTON: string;
  CONFIRM_SIGN_MESSAGE_BUTTON: string;
  CANCEL_SIGN_MESSAGE_BUTTON: string;
}

/**
 * Web element IDs for the Multichain Test Dapp
 */
export const TronTestDappSelectorsWebIDs: TronTestDappWebIDs = {
  WALLET_BUTTON: '.adapter-react-button', // Important space between classes to indicate a parent-child relationship
  DISCONNECT_BUTTON: '.adapter-dropdown-list-item',
  CONFIRM_TRANSACTION_BUTTON:
    'confirm-sign-transaction-confirm-snap-footer-button',
  CANCEL_TRANSACTION_BUTTON:
    'confirm-sign-and-send-transaction-cancel-snap-footer-button',
  CONFIRM_SIGN_MESSAGE_BUTTON:
    'confirm-sign-message-confirm-snap-footer-button',
  CANCEL_SIGN_MESSAGE_BUTTON: 'confirm-sign-message-cancel-snap-footer-button',
};

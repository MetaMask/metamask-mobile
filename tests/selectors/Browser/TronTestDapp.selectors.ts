/**
 * IDs for web elements in the Tron Test Dapp
 */
export interface TronTestDappWebIDs {
  WALLET_BUTTON: string;
  DISCONNECT_BUTTON: string;
  CONFIRM_SIGN_MESSAGE_BUTTON: string;
}

/**
 * Web element IDs for the Tron Test Dapp
 */
export const TronTestDappSelectorsWebIDs: TronTestDappWebIDs = {
  WALLET_BUTTON: '.adapter-react-button', // Important space between classes to indicate a parent-child relationship
  DISCONNECT_BUTTON: '.adapter-dropdown-list-item',
  CONFIRM_SIGN_MESSAGE_BUTTON:
    'confirm-sign-message-confirm-snap-footer-button',
};

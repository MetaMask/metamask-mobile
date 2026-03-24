/**
 * IDs for web elements in the Multichain Test Dapp
 */
export interface MultichainTestDappViewWebIDs {
  EXTENSION_ID_INPUT: string;
  CONNECT_BUTTON: string;
  AUTO_CONNECT_BUTTON: string;
  CREATE_SESSION_BUTTON: string;
  GET_SESSION_BUTTON: string;
  REVOKE_SESSION_BUTTON: string;
  CLEAR_EXTENSION_BUTTON: string;
  INVOKE_ALL_METHODS_BUTTON: string;
  CLEAR_RESULTS_BUTTON: string;
  SESSION_METHOD_DETAILS: string;
  SESSION_METHOD_RESULT: string;
  NETWORK_CHECKBOX_PREFIX: string;
  WALLET_SESSION_CHANGED_RESULT: string;
  WALLET_NOTIFY_CONTAINER: string;
  WALLET_NOTIFY_EMPTY: string;
  WALLET_NOTIFY_DETAILS: string;
  DIRECT_INVOKE_PREFIX: string;
  INVOKE_METHOD_RESULT_PREFIX: string;
  INVOKE_CONTAINER_PREFIX: string;
  METHOD_RESULT_ITEM_PREFIX: string;
  METHOD_RESULT_DETAILS_PREFIX: string;
}

/**
 * Web element IDs for the Multichain Test Dapp
 */
export const MultichainTestDappViewSelectorsIDs: MultichainTestDappViewWebIDs =
  {
    // Using the exact IDs from the multichain test dapp
    EXTENSION_ID_INPUT: 'extension-id-input',
    CONNECT_BUTTON: 'connect-button',
    AUTO_CONNECT_BUTTON: 'auto-connect-postmessage-button',
    CREATE_SESSION_BUTTON: 'create-session-btn',
    GET_SESSION_BUTTON: 'get-session-btn',
    REVOKE_SESSION_BUTTON: 'revoke-session-btn',
    CLEAR_EXTENSION_BUTTON: 'clear-extension-button',
    INVOKE_ALL_METHODS_BUTTON: 'invoke-all-methods-button',
    CLEAR_RESULTS_BUTTON: 'clear-results-button',
    SESSION_METHOD_DETAILS: 'session-method-details-',
    SESSION_METHOD_RESULT: 'session-method-result-',
    NETWORK_CHECKBOX_PREFIX: 'network-checkbox-',
    WALLET_SESSION_CHANGED_RESULT: 'wallet-session-changed-result-',
    WALLET_NOTIFY_CONTAINER: 'wallet-notify-container',
    WALLET_NOTIFY_EMPTY: 'wallet-notify-empty',
    WALLET_NOTIFY_DETAILS: 'wallet-notify-details-',
    DIRECT_INVOKE_PREFIX: 'direct-invoke-',
    INVOKE_METHOD_RESULT_PREFIX: 'invoke-method-',
    INVOKE_CONTAINER_PREFIX: 'invoke-container-',
    METHOD_RESULT_ITEM_PREFIX: 'method-result-item-',
    METHOD_RESULT_DETAILS_PREFIX: 'method-result-details-',
  };

/**
 * Timeout constants for multichain tests
 */
export const MULTICHAIN_TEST_TIMEOUTS = {
  NAVIGATION: 10000,
  CONNECTION: 3000,
  SESSION_CREATION: 2000,
  METHOD_INVOCATION: 3000,
  NOTIFICATION_WAIT: 8000,
  DEFAULT_DELAY: 1000,
  ELEMENT_VISIBILITY: 5000,
};

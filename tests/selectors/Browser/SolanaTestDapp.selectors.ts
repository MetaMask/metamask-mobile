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
 * Second-slot default testID from BottomSheetFooter (primary action). Duplicated here
 * instead of importing `BottomSheetFooter.constants` in E2E — that file pulls in
 * component-library Button → `react-native`, which Jest cannot parse in Detox runs.
 *
 * @see app/component-library/components/BottomSheets/BottomSheetFooter/BottomSheetFooter.constants.ts
 */
export const BOTTOM_SHEET_FOOTER_SUBSEQUENT_BUTTON_TEST_ID =
  'bottomsheetfooter-button-subsequent';

/**
 * Snap UI footer confirm for Solana sign message (`name` + `-snap-footer-button` in SnapUIFooterButton).
 *
 * @see @metamask/solana-wallet-snap (confirm-sign-message-confirm)
 */
export const SOLANA_SNAP_SIGN_MESSAGE_CONFIRM_TEST_ID =
  'confirm-sign-message-confirm-snap-footer-button';

/**
 * Snap UI footer confirm for Solana transaction review (send / sign-and-send).
 *
 * @see tests/selectors/SendFlow/SendActionView.selectors.ts (SEND_TRANSACTION_BUTTON)
 */
export const SOLANA_SNAP_TRANSACTION_CONFIRM_TEST_ID =
  'transaction-confirmation-submit-button-snap-footer-button';

/**
 * Timeout constants for solana tests
 */
export const SOLANA_TEST_TIMEOUTS = {
  CONNECTION: 2000,
  DEFAULT_DELAY: 2000,
  METHOD_INVOCATION: 3000,
  ELEMENT_VISIBILITY: 5000,
};

/**
 * Hardware Wallet Bottom Sheet
 *
 * Unified bottom sheet component for hardware wallet operations.
 * Replaces legacy modal steps with a state-driven approach.
 */

export {
  HardwareWalletBottomSheet,
  type HardwareWalletBottomSheetProps,
  HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID,
} from './HardwareWalletBottomSheet';

// Re-export content components for direct use if needed
export {
  ConnectingContent,
  AwaitingAppContent,
  AwaitingConfirmationContent,
  ErrorContent,
  SuccessContent,
  type ConnectingContentProps,
  type AwaitingAppContentProps,
  type AwaitingConfirmationContentProps,
  type ErrorContentProps,
  type SuccessContentProps,
  // Test IDs
  CONNECTING_CONTENT_TEST_ID,
  CONNECTING_CONTENT_SPINNER_TEST_ID,
  AWAITING_APP_CONTENT_TEST_ID,
  AWAITING_CONFIRMATION_CONTENT_TEST_ID,
  AWAITING_CONFIRMATION_SPINNER_TEST_ID,
  ERROR_CONTENT_TEST_ID,
  ERROR_CONTENT_ICON_TEST_ID,
  ERROR_CONTENT_TITLE_TEST_ID,
  ERROR_CONTENT_MESSAGE_TEST_ID,
  SUCCESS_CONTENT_TEST_ID,
  SUCCESS_CONTENT_ICON_TEST_ID,
} from './contents';

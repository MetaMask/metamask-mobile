/**
 * Hardware Wallet Components Module
 */

// Unified bottom sheet - handles all connection states including errors
export {
  HardwareWalletBottomSheet,
  type HardwareWalletBottomSheetProps,
  HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID,
  // Content components
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
} from './HardwareWalletBottomSheet';

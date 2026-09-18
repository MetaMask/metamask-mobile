import { strings } from '../../../../locales/i18n';
import {
  ErrorCode,
  HardwareWalletError,
  HardwareWalletType,
} from '@metamask/hw-wallet-sdk';
import {
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { MOBILE_ERROR_EXTENSIONS } from './mappings';
import { parseErrorByType } from './parser';
import { RecoveryAction } from './types';

/**
 * Check if an error represents a user cancellation.
 *
 * Returns `true` ONLY for parsed `HardwareWalletError` instances whose code is
 * `UserRejected` or `UserCancelled`. RAW keyring/transport errors (e.g. a
 * Ledger `TransportStatusError` with status `0x6985`) are NOT
 * `HardwareWalletError` instances and return `false` BY DESIGN — the
 * confirm-flow suppression depends on raw errors being ignored here. To
 * classify a possibly-raw error, parse it first (see
 * {@link isDeviceUserRejection}).
 */
export function isUserCancellation(error: unknown): boolean {
  if (HardwareWalletError.isHardwareWalletError(error)) {
    return (
      error.code === ErrorCode.UserRejected ||
      error.code === ErrorCode.UserCancelled
    );
  }
  return false;
}

/**
 * Swap/bridge-internal failure messages that merely LOOK like device
 * cancellations and must never be classified as a user rejection. Keep in
 * sync with:
 * - BATCH_CANCELLED_ERROR in app/components/UI/HardwareWallet/Swaps/hw-batch-sign/constants.ts
 * - STX_NO_HASH_ERROR in app/util/smart-transactions/smart-publish-hook.ts
 */
export const INTERNAL_ABORT_MESSAGES: readonly string[] = [
  'Batch cancelled',
  'Smart Transaction does not have a transaction hash, there was a problem',
];

/**
 * Classifies a possibly-RAW error (keyring/transport/approval rejection) as a
 * device-side user rejection by parsing it first. Internal abort signals whose
 * messages merely CONTAIN cancellation keywords (e.g. 'Batch cancelled') must be
 * passed via excludedMessages (exact match) so they are not misclassified. For
 * swap/send callers, use {@link INTERNAL_ABORT_MESSAGES} as the recommended
 * exclusion list.
 */
export function isDeviceUserRejection(
  error: unknown,
  options?: { excludedMessages?: readonly string[] },
): boolean {
  if (
    error instanceof Error &&
    options?.excludedMessages?.includes(error.message)
  ) {
    return false;
  }
  return isUserCancellation(parseErrorByType(error));
}

/**
 * Get the icon for a hardware wallet error code
 *
 * @param errorCode - The error code
 * @returns The icon name to display
 */
export function getIconForErrorCode(errorCode: ErrorCode): IconName {
  const ext = MOBILE_ERROR_EXTENSIONS[errorCode];
  return ext?.icon ?? IconName.Danger;
}

/**
 * Get the icon color for a hardware wallet error code
 *
 * @param errorCode - The error code
 * @returns The icon color to use
 */
export function getIconColorForErrorCode(errorCode: ErrorCode): IconColor {
  const ext = MOBILE_ERROR_EXTENSIONS[errorCode];
  return ext?.iconColor ?? IconColor.Warning;
}

/**
 * Get the localized title for a hardware wallet error code
 *
 * @param errorCode - The error code
 * @param walletType - Optional wallet type for device-specific titles
 * @returns The short title for display (e.g., "Ledger locked")
 */
export function getTitleForErrorCode(
  errorCode: ErrorCode,
  walletType?: HardwareWalletType,
): string {
  const ext = MOBILE_ERROR_EXTENSIONS[errorCode];
  return (
    ext?.getLocalizedTitle(walletType) ??
    strings('hardware_wallet.error.something_went_wrong')
  );
}

/**
 * Get the recovery action for a hardware wallet error code
 *
 * @param errorCode - The error code
 * @returns The recovery action
 */
export function getRecoveryActionForErrorCode(
  errorCode: ErrorCode,
): RecoveryAction {
  const ext = MOBILE_ERROR_EXTENSIONS[errorCode];
  return ext?.recoveryAction ?? RecoveryAction.RETRY;
}

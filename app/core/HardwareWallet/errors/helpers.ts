/**
 * Error Helpers
 *
 * Utility functions for working with hardware wallet errors.
 */

import { strings } from '../../../../locales/i18n';
import { ErrorCode, HardwareWalletError } from '@metamask/hw-wallet-sdk';
import {
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { HardwareWalletType } from '../helpers';
import { MOBILE_ERROR_EXTENSIONS } from './mappings';
import { RecoveryAction } from './types';

/**
 * Check if an error is a HardwareWalletError
 */
export function isHardwareWalletError(
  error: unknown,
): error is HardwareWalletError {
  return error instanceof HardwareWalletError;
}

/**
 * Check if an error represents a user cancellation
 */
export function isUserCancellation(error: unknown): boolean {
  if (isHardwareWalletError(error)) {
    return (
      error.code === ErrorCode.UserRejected ||
      error.code === ErrorCode.UserCancelled
    );
  }
  return false;
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
  return ext?.iconColor ?? IconColor.Error;
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

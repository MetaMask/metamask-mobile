import {
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { HardwareWalletType } from '../helpers';

/**
 * Specifies what action the UI should present to the user to recover from an error.
 * This is mobile-specific because we can deep-link to system settings.
 */
export enum RecoveryAction {
  /** User acknowledges the error and continues (shows "Continue" button) */
  ACKNOWLEDGE = 'acknowledge',
  /** Retry the failed operation */
  RETRY = 'retry',
}

/**
 * Mobile-specific error extension
 * Adds features not in the SDK: recoveryAction, localized messages, icons
 */
export interface MobileErrorExtension {
  recoveryAction: RecoveryAction;
  icon: IconName;
  iconColor: IconColor;
  /** Short title for error display (e.g., "Device Locked") */
  getLocalizedTitle: (walletType?: HardwareWalletType) => string;
  /** Localized user message (overrides SDK's English message) */
  getLocalizedMessage: (walletType?: HardwareWalletType) => string;
}

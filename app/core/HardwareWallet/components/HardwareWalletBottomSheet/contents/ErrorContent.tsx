/**
 * Error Content Component
 *
 * Displays error information with action based on the error's recovery action:
 * - RETRY: Shows "Continue" button that retries the operation
 * - ACKNOWLEDGE: Shows "Continue" button that just dismisses the sheet
 *
 * The user can also swipe down to dismiss (returns false from ensureDeviceReady).
 */

import React, { useMemo, useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { HardwareWalletError } from '@metamask/hw-wallet-sdk';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { Colors } from '../../../../../util/theme/models';

import {
  getIconForErrorCode,
  getIconColorForErrorCode,
  getTitleForErrorCode,
  getRecoveryActionForErrorCode,
  RecoveryAction,
} from '../../../errors';
import { HardwareWalletType } from '../../../helpers';

// Test IDs
export const ERROR_CONTENT_TEST_ID = 'error-content';
export const ERROR_CONTENT_ICON_TEST_ID = 'error-content-icon';
export const ERROR_CONTENT_TITLE_TEST_ID = 'error-content-title';
export const ERROR_CONTENT_MESSAGE_TEST_ID = 'error-content-message';
export const ERROR_CONTENT_CONTINUE_BUTTON_TEST_ID =
  'error-content-continue-button';

const createStyles = (_colors: Colors) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
      marginTop: 8,
    },
    titleContainer: {
      alignItems: 'center',
      marginBottom: 8,
    },
    title: {
      textAlign: 'center',
    },
    messageContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    message: {
      textAlign: 'center',
    },
    buttonContainer: {
      gap: 12,
      width: '100%',
    },
  });

export interface ErrorContentProps {
  /** The error to display */
  error: HardwareWalletError | null;
  /** The device type for context in error messages */
  deviceType?: HardwareWalletType;
  /** Callback when user taps Continue and recovery action is RETRY */
  onContinue?: () => void | Promise<void>;
  /** Callback when user taps Continue and recovery action is ACKNOWLEDGE (just dismiss) */
  onDismiss?: () => void;
  /** Whether a retry is currently in progress */
  isLoading?: boolean;
}

/**
 * Content component for displaying hardware wallet errors.
 * Button behavior depends on the error's recovery action:
 * - RETRY: Retries the operation
 * - ACKNOWLEDGE: Just dismisses the sheet
 */
export const ErrorContent: React.FC<ErrorContentProps> = ({
  error,
  deviceType = HardwareWalletType.Ledger,
  onContinue,
  onDismiss,
  isLoading = false,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Track local loading state for button press
  const [isRetrying, setIsRetrying] = useState(false);

  // Get the recovery action for this error
  const recoveryAction = useMemo(() => {
    if (!error) return RecoveryAction.RETRY;
    return getRecoveryActionForErrorCode(error.code);
  }, [error]);

  // Combined loading state (only for RETRY actions)
  const showLoading =
    recoveryAction === RecoveryAction.RETRY && (isLoading || isRetrying);

  const errorTitle = useMemo(() => {
    if (!error) return strings('hardware_wallet.error.something_went_wrong');
    return getTitleForErrorCode(error.code, deviceType);
  }, [error, deviceType]);

  const errorMessage = useMemo(() => error?.userMessage ?? null, [error]);

  const handleContinue = useCallback(async () => {
    // For ACKNOWLEDGE, just dismiss - no loading state needed
    if (recoveryAction === RecoveryAction.ACKNOWLEDGE) {
      onDismiss?.();
      return;
    }

    // For RETRY, show loading and retry
    if (showLoading) return; // Prevent double-tap

    setIsRetrying(true);
    try {
      await onContinue?.();
    } finally {
      // Note: setIsRetrying(false) is not called here because the component
      // will either unmount (success) or receive a new error (which resets state)
      // If we're still mounted after the operation, it means we got a new error
      setIsRetrying(false);
    }
  }, [onContinue, onDismiss, recoveryAction, showLoading]);

  // Don't render if no error
  if (!error) {
    return null;
  }

  return (
    <View style={styles.container} testID={ERROR_CONTENT_TEST_ID}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Icon
          testID={ERROR_CONTENT_ICON_TEST_ID}
          name={getIconForErrorCode(error.code)}
          size={IconSize.Xl}
          color={getIconColorForErrorCode(error.code)}
        />
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text
          testID={ERROR_CONTENT_TITLE_TEST_ID}
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.title}
        >
          {errorTitle}
        </Text>
      </View>

      {/* Message */}
      {errorMessage && (
        <View style={styles.messageContainer}>
          <Text
            testID={ERROR_CONTENT_MESSAGE_TEST_ID}
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            style={styles.message}
          >
            {errorMessage}
          </Text>
        </View>
      )}

      {/* Single Continue Button - always retries */}
      <View style={styles.buttonContainer}>
        <Button
          testID={ERROR_CONTENT_CONTINUE_BUTTON_TEST_ID}
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('hardware_wallet.common.continue')}
          onPress={handleContinue}
          isDisabled={showLoading}
          loading={showLoading}
        />
      </View>
    </View>
  );
};

export default ErrorContent;

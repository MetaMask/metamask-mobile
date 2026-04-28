import React, { useMemo, useCallback, useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import {
  HardwareWalletError,
  HardwareWalletType,
} from '@metamask/hw-wallet-sdk';

import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';

import { strings } from '../../../../../../locales/i18n';

import {
  getIconForErrorCode,
  getIconColorForErrorCode,
  getTitleForErrorCode,
  getRecoveryActionForErrorCode,
  getQRHardwareScanErrorTitle,
  isQRHardwareScanError,
  RecoveryAction,
} from '../../../errors';
import { ContentLayout } from './ContentLayout';

export const ERROR_CONTENT_TEST_ID = 'error-content';
export const ERROR_CONTENT_ICON_TEST_ID = 'error-content-icon';
export const ERROR_CONTENT_TITLE_TEST_ID = 'error-content-title';
export const ERROR_CONTENT_MESSAGE_TEST_ID = 'error-content-message';
export const ERROR_CONTENT_CONTINUE_BUTTON_TEST_ID =
  'error-content-continue-button';
export const ERROR_CONTENT_LEARN_MORE_BUTTON_TEST_ID =
  'error-content-learn-more-button';

const QR_HARDWARE_LEARN_MORE_URL =
  'https://support.metamask.io/more-web3/wallets/hardware-wallet-hub/#qr-codean-gapped-wallets';

const styles = StyleSheet.create({
  message: {
    textAlign: 'center',
  },
});

export interface ErrorContentProps {
  /** The error to display */
  error: HardwareWalletError | null;
  /** The device type for context in error messages */
  deviceType: HardwareWalletType;
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
  deviceType,
  onContinue,
  onDismiss,
  isLoading = false,
}) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const recoveryAction = useMemo(() => {
    if (!error) return RecoveryAction.RETRY;
    return getRecoveryActionForErrorCode(error.code);
  }, [error]);

  const isQrScanError = useMemo(
    () => Boolean(error && isQRHardwareScanError(error)),
    [error],
  );

  const showLoading =
    !isQrScanError &&
    recoveryAction === RecoveryAction.RETRY &&
    (isLoading || isRetrying);

  const errorTitle = useMemo(() => {
    if (!error) return strings('hardware_wallet.error.something_went_wrong');
    if (isQRHardwareScanError(error)) {
      return getQRHardwareScanErrorTitle(error);
    }
    return getTitleForErrorCode(error.code, deviceType);
  }, [error, deviceType]);

  const errorMessage = useMemo(() => error?.userMessage ?? null, [error]);

  const buttonLabel = useMemo(() => {
    if (isQrScanError) {
      return strings('hardware_wallet.common.try_again');
    }
    if (recoveryAction === RecoveryAction.OPEN_SETTINGS) {
      return strings('hardware_wallet.error.view_settings');
    }
    return strings('hardware_wallet.common.continue');
  }, [isQrScanError, recoveryAction]);

  const handleContinue = useCallback(async () => {
    if (isQrScanError) {
      await onContinue?.();
      return;
    }

    if (recoveryAction === RecoveryAction.ACKNOWLEDGE) {
      onDismiss?.();
      return;
    }

    if (recoveryAction === RecoveryAction.OPEN_SETTINGS) {
      await Linking.openSettings();
      return;
    }

    if (showLoading) return;

    setIsRetrying(true);
    try {
      await onContinue?.();
    } finally {
      setIsRetrying(false);
    }
  }, [isQrScanError, onContinue, onDismiss, recoveryAction, showLoading]);

  const handleLearnMore = useCallback(async () => {
    await Linking.openURL(QR_HARDWARE_LEARN_MORE_URL);
  }, []);

  if (!error) {
    return null;
  }

  return (
    <ContentLayout
      testID={ERROR_CONTENT_TEST_ID}
      titleTestID={ERROR_CONTENT_TITLE_TEST_ID}
      icon={
        isQrScanError ? undefined : (
          <Icon
            testID={ERROR_CONTENT_ICON_TEST_ID}
            name={getIconForErrorCode(error.code)}
            size={IconSize.Xl}
            color={getIconColorForErrorCode(error.code)}
          />
        )
      }
      title={errorTitle}
      body={
        errorMessage ? (
          <Text
            testID={ERROR_CONTENT_MESSAGE_TEST_ID}
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            style={styles.message}
          >
            {errorMessage}
          </Text>
        ) : undefined
      }
      footer={
        <>
          {isQrScanError ? (
            <Button
              testID={ERROR_CONTENT_LEARN_MORE_BUTTON_TEST_ID}
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('hardware_wallet.common.learn_more')}
              onPress={handleLearnMore}
            />
          ) : null}
          <Button
            testID={ERROR_CONTENT_CONTINUE_BUTTON_TEST_ID}
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={buttonLabel}
            onPress={handleContinue}
            isDisabled={showLoading}
            loading={showLoading}
          />
        </>
      }
    />
  );
};

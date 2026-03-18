import React, { useMemo, useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
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
  RecoveryAction,
} from '../../../errors';
import { ContentLayout } from './ContentLayout';

export const ERROR_CONTENT_TEST_ID = 'error-content';
export const ERROR_CONTENT_ICON_TEST_ID = 'error-content-icon';
export const ERROR_CONTENT_TITLE_TEST_ID = 'error-content-title';
export const ERROR_CONTENT_MESSAGE_TEST_ID = 'error-content-message';
export const ERROR_CONTENT_CONTINUE_BUTTON_TEST_ID =
  'error-content-continue-button';

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

  const showLoading =
    recoveryAction === RecoveryAction.RETRY && (isLoading || isRetrying);

  const errorTitle = useMemo(() => {
    if (!error) return strings('hardware_wallet.error.something_went_wrong');
    return getTitleForErrorCode(error.code, deviceType);
  }, [error, deviceType]);

  const errorMessage = useMemo(() => error?.userMessage ?? null, [error]);

  const handleContinue = useCallback(async () => {
    if (recoveryAction === RecoveryAction.ACKNOWLEDGE) {
      onDismiss?.();
      return;
    }

    if (showLoading) return;

    setIsRetrying(true);
    try {
      await onContinue?.();
    } finally {
      setIsRetrying(false);
    }
  }, [onContinue, onDismiss, recoveryAction, showLoading]);

  if (!error) {
    return null;
  }

  return (
    <ContentLayout
      testID={ERROR_CONTENT_TEST_ID}
      titleTestID={ERROR_CONTENT_TITLE_TEST_ID}
      icon={
        <Icon
          testID={ERROR_CONTENT_ICON_TEST_ID}
          name={getIconForErrorCode(error.code)}
          size={IconSize.Xl}
          color={getIconColorForErrorCode(error.code)}
        />
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
      }
    />
  );
};

import React, { useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

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
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';

import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { getHardwareWalletTypeName } from '../../../helpers';
import { ContentLayout } from './ContentLayout';

export const AWAITING_CONFIRMATION_CONTENT_TEST_ID =
  'awaiting-confirmation-content';
export const AWAITING_CONFIRMATION_SPINNER_TEST_ID =
  'awaiting-confirmation-spinner';

const styles = StyleSheet.create({
  messageText: {
    textAlign: 'center',
  },
  spinnerContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
});

export interface AwaitingConfirmationContentProps {
  /** The device type for context in messages */
  deviceType: HardwareWalletType;
  /** The type of operation awaiting confirmation (e.g., 'transaction', 'message') */
  operationType?: string;
  /** Optional callback when user wants to cancel/reject */
  onCancel?: () => void;
}

export const AwaitingConfirmationContent: React.FC<
  AwaitingConfirmationContentProps
> = ({ deviceType, operationType, onCancel }) => {
  const { colors } = useTheme();
  const deviceName = getHardwareWalletTypeName(deviceType);

  const title = useMemo(() => {
    switch (operationType) {
      case 'message':
        return strings('hardware_wallet.awaiting_confirmation.title_message', {
          device: deviceName,
        });
      case 'transaction':
      default:
        return strings(
          'hardware_wallet.awaiting_confirmation.title_transaction',
          { device: deviceName },
        );
    }
  }, [operationType, deviceName]);

  return (
    <ContentLayout
      testID={AWAITING_CONFIRMATION_CONTENT_TEST_ID}
      icon={
        <Icon
          name={IconName.SecurityTick}
          size={IconSize.Xl}
          color={IconColor.Primary}
        />
      }
      title={title}
      body={
        <>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            style={styles.messageText}
          >
            {strings('hardware_wallet.awaiting_confirmation.message', {
              device: deviceName,
            })}
          </Text>
          <View style={styles.spinnerContainer}>
            <ActivityIndicator
              testID={AWAITING_CONFIRMATION_SPINNER_TEST_ID}
              size="large"
              color={colors.primary.default}
            />
          </View>
        </>
      }
      footer={
        onCancel ? (
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            label={strings('hardware_wallet.common.cancel')}
            width={ButtonWidthTypes.Full}
            onPress={onCancel}
          />
        ) : undefined
      }
    />
  );
};

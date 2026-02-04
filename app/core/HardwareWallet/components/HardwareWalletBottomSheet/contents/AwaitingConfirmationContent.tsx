/**
 * Awaiting Confirmation Content Component
 *
 * Displays a message prompting the user to confirm a transaction on their hardware wallet device.
 * Device-agnostic component using generic icons consistent with ErrorContent.
 */

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
import { Colors } from '../../../../../util/theme/models';
import { HardwareWalletType } from '../../../helpers';

// Test IDs
export const AWAITING_CONFIRMATION_CONTENT_TEST_ID =
  'awaiting-confirmation-content';
export const AWAITING_CONFIRMATION_SPINNER_TEST_ID =
  'awaiting-confirmation-spinner';

const createStyles = (colors: Colors) =>
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
      marginBottom: 16,
    },
    messageText: {
      textAlign: 'center',
    },
    operationTypeContainer: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 12,
    },
    spinnerContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    buttonContainer: {
      marginTop: 16,
      width: '100%',
    },
  });

export interface AwaitingConfirmationContentProps {
  /** The device type for context in messages */
  deviceType?: HardwareWalletType;
  /** The type of operation awaiting confirmation (e.g., 'transaction', 'message') */
  operationType?: string;
  /** Optional callback when user wants to cancel/reject */
  onCancel?: () => void;
}

/**
 * Content component shown when waiting for user confirmation on the hardware wallet device.
 * Uses generic icons consistent with ErrorContent design.
 */
export const AwaitingConfirmationContent: React.FC<
  AwaitingConfirmationContentProps
> = ({ deviceType = HardwareWalletType.Ledger, operationType, onCancel }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Get device-specific name for display
  const deviceName = useMemo(
    () => strings(`hardware_wallet.device_names.${deviceType.toLowerCase()}`),
    [deviceType],
  );

  // Determine the title based on operation type
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
    <View
      style={styles.container}
      testID={AWAITING_CONFIRMATION_CONTENT_TEST_ID}
    >
      {/* Icon - consistent with ErrorContent design */}
      <View style={styles.iconContainer}>
        <Icon
          name={IconName.SecurityTick}
          size={IconSize.Xl}
          color={IconColor.Primary}
        />
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.title}
        >
          {title}
        </Text>
      </View>

      {/* Message */}
      <View style={styles.messageContainer}>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Default}
          style={styles.messageText}
        >
          {strings('hardware_wallet.awaiting_confirmation.message', {
            device: deviceName,
          })}
        </Text>
      </View>

      {/* Loading spinner */}
      <View style={styles.spinnerContainer}>
        <ActivityIndicator
          testID={AWAITING_CONFIRMATION_SPINNER_TEST_ID}
          size="large"
          color={colors.primary.default}
        />
      </View>

      {/* Cancel/Reject button */}
      {onCancel && (
        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            label={strings('hardware_wallet.common.cancel')}
            width={ButtonWidthTypes.Full}
            onPress={onCancel}
          />
        </View>
      )}
    </View>
  );
};

export default AwaitingConfirmationContent;

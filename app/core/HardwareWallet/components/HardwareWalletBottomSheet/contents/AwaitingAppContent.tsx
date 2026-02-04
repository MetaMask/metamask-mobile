/**
 * Awaiting App Content Component
 *
 * Displays a message prompting the user to open the Ethereum app on their hardware wallet device.
 * Device-agnostic component using generic icons consistent with ErrorContent.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

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
export const AWAITING_APP_CONTENT_TEST_ID = 'awaiting-app-content';

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
      marginBottom: 24,
    },
    messageText: {
      textAlign: 'center',
      marginBottom: 8,
    },
    currentAppContainer: {
      backgroundColor: colors.background.alternative,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 12,
    },
    currentAppText: {
      textAlign: 'center',
    },
    buttonContainer: {
      marginTop: 16,
      width: '100%',
    },
  });

export interface AwaitingAppContentProps {
  /** The device type for context in messages */
  deviceType?: HardwareWalletType;
  /** The name of the app currently open on the device (if known) */
  currentApp?: string;
  /** The required app name (defaults to 'Ethereum') */
  requiredApp?: string;
  /** Callback when user taps Continue to retry */
  onContinue?: () => void;
  /** Whether a retry is in progress */
  isLoading?: boolean;
}

/**
 * Content component shown when the user needs to open the Ethereum app on their hardware wallet.
 * Uses generic icons consistent with ErrorContent design.
 */
export const AwaitingAppContent: React.FC<AwaitingAppContentProps> = ({
  deviceType = HardwareWalletType.Ledger,
  currentApp,
  requiredApp = 'Ethereum',
  onContinue,
  isLoading = false,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const showCurrentApp =
    currentApp && currentApp !== requiredApp && currentApp !== 'BOLOS';

  // Get device-specific name for display
  const deviceName = useMemo(
    () => strings(`hardware_wallet.device_names.${deviceType.toLowerCase()}`),
    [deviceType],
  );

  return (
    <View style={styles.container} testID={AWAITING_APP_CONTENT_TEST_ID}>
      {/* Icon - consistent with ErrorContent design */}
      <View style={styles.iconContainer}>
        <Icon
          name={IconName.Setting}
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
          {strings('hardware_wallet.awaiting_app.title', {
            app: requiredApp,
          })}
        </Text>
      </View>

      {/* Message */}
      <View style={styles.messageContainer}>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Default}
          style={styles.messageText}
        >
          {strings('hardware_wallet.awaiting_app.message', {
            device: deviceName,
            app: requiredApp,
          })}
        </Text>

        {/* Show current app if different from required */}
        {showCurrentApp && (
          <View style={styles.currentAppContainer}>
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Default}
              style={styles.currentAppText}
            >
              {strings('hardware_wallet.awaiting_app.current_app', {
                app: currentApp,
              })}
            </Text>
          </View>
        )}
      </View>

      {/* Continue button - user taps after opening app */}
      {onContinue && (
        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('hardware_wallet.common.continue')}
            onPress={onContinue}
            loading={isLoading}
            disabled={isLoading}
          />
        </View>
      )}
    </View>
  );
};

export default AwaitingAppContent;

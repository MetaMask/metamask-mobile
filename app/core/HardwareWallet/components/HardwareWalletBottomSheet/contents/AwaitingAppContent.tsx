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
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { getHardwareWalletTypeName } from '../../../helpers';
import { ContentLayout } from './ContentLayout';

export const AWAITING_APP_CONTENT_TEST_ID = 'awaiting-app-content';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
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
  });

export interface AwaitingAppContentProps {
  /** The device type for context in messages */
  deviceType: HardwareWalletType;
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
 * Content component shown when the user needs to open the correct app on their hardware wallet.
 */
export const AwaitingAppContent: React.FC<AwaitingAppContentProps> = ({
  deviceType,
  currentApp,
  requiredApp = 'Ethereum',
  onContinue,
  isLoading = false,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const deviceName = getHardwareWalletTypeName(deviceType);

  const showCurrentApp =
    currentApp && currentApp !== requiredApp && currentApp !== 'BOLOS';

  return (
    <ContentLayout
      testID={AWAITING_APP_CONTENT_TEST_ID}
      icon={
        <Icon
          name={IconName.Setting}
          size={IconSize.Xl}
          color={IconColor.Primary}
        />
      }
      title={strings('hardware_wallet.awaiting_app.title', {
        app: requiredApp,
      })}
      body={
        <>
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
        </>
      }
      footer={
        onContinue ? (
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label={strings('hardware_wallet.common.continue')}
            onPress={onContinue}
            loading={isLoading}
            disabled={isLoading}
          />
        ) : undefined
      }
    />
  );
};

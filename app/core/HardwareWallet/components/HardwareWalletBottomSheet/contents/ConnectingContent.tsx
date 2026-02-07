/**
 * Connecting Content Component
 *
 * Displays tips and a spinner while searching for / connecting to a hardware wallet device.
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

import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { Colors } from '../../../../../util/theme/models';
import { HardwareWalletType } from '../../../helpers';

// Test IDs
export const CONNECTING_CONTENT_TEST_ID = 'connecting-content';
export const CONNECTING_CONTENT_SPINNER_TEST_ID = 'connecting-content-spinner';

const createStyles = (_colors: Colors) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    topSpacer: {
      height: 24, // Approximate space taken by icon in other content components
    },
    titleContainer: {
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      textAlign: 'center',
    },
    tipsContainer: {
      marginBottom: 24,
    },
    tipsHeader: {
      marginBottom: 12,
    },
    tipItem: {
      flexDirection: 'row',
      marginBottom: 8,
      paddingLeft: 8,
    },
    tipBullet: {
      marginRight: 8,
    },
    tipText: {
      flex: 1,
    },
    buttonContainer: {
      marginTop: 8,
      width: '100%',
    },
  });

interface TipItemProps {
  text: string;
}

const TipItem: React.FC<TipItemProps> = ({ text }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.tipItem}>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Default}
        style={styles.tipBullet}
      >
        •
      </Text>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Default}
        style={styles.tipText}
      >
        {text}
      </Text>
    </View>
  );
};

export interface ConnectingContentProps {
  /** The device type for context in messages */
  deviceType?: HardwareWalletType;
}

/**
 * Content component shown while connecting to a hardware wallet device.
 * Displays helpful tips and a loading indicator.
 * Uses generic icons consistent with ErrorContent design.
 */
export const ConnectingContent: React.FC<ConnectingContentProps> = ({
  deviceType = HardwareWalletType.Ledger,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Get device-specific name for display
  const deviceName = useMemo(
    () => strings(`hardware_wallet.device_names.${deviceType.toLowerCase()}`),
    [deviceType],
  );

  return (
    <View style={styles.container} testID={CONNECTING_CONTENT_TEST_ID}>
      {/* Top spacer to match icon height in other content components */}
      <View style={styles.topSpacer} />

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.title}
        >
          {strings('hardware_wallet.connecting.title', {
            device: deviceName,
          })}
        </Text>
      </View>

      {/* Tips */}
      <View style={styles.tipsContainer}>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Default}
          style={styles.tipsHeader}
        >
          {strings('hardware_wallet.connecting.tips_header')}
        </Text>

        <TipItem
          text={strings('hardware_wallet.connecting.tip_unlock', {
            device: deviceName,
          })}
        />
        <TipItem text={strings('hardware_wallet.connecting.tip_open_app')} />
        <TipItem
          text={strings('hardware_wallet.connecting.tip_enable_bluetooth')}
        />
        <TipItem text={strings('hardware_wallet.connecting.tip_dnd_off')} />
      </View>

      {/* Loading button - non-clickable with spinner */}
      <View style={styles.buttonContainer}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label=""
          // eslint-disable-next-line no-empty-function
          onPress={() => {}}
          loading
          testID={CONNECTING_CONTENT_SPINNER_TEST_ID}
        />
      </View>
    </View>
  );
};

export default ConnectingContent;

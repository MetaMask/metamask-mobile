/**
 * Success Content Component
 *
 * Displays a brief success message after a successful operation.
 * Auto-dismisses without requiring user action.
 */

import React, { useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
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
export const SUCCESS_CONTENT_TEST_ID = 'success-content';
export const SUCCESS_CONTENT_ICON_TEST_ID = 'success-content-icon';

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
    },
    title: {
      textAlign: 'center',
    },
  });

export interface SuccessContentProps {
  /** The device type for context in messages */
  deviceType?: HardwareWalletType;
  /** Callback when auto-dismiss triggers */
  onDismiss?: () => void;
  /** Auto-dismiss after this many milliseconds (0 to disable) */
  autoDismissMs?: number;
}

/**
 * Content component for displaying success feedback.
 * Auto-dismisses after the specified timeout - no button shown.
 */
export const SuccessContent: React.FC<SuccessContentProps> = ({
  deviceType = HardwareWalletType.Ledger,
  onDismiss,
  autoDismissMs = 0,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Get device-specific name for display
  const deviceName = useMemo(
    () => strings(`hardware_wallet.device_names.${deviceType.toLowerCase()}`),
    [deviceType],
  );

  // Auto-dismiss effect
  useEffect(() => {
    if (autoDismissMs > 0 && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismissMs);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoDismissMs, onDismiss]);

  return (
    <View style={styles.container} testID={SUCCESS_CONTENT_TEST_ID}>
      {/* Success Icon */}
      <View style={styles.iconContainer}>
        <Icon
          testID={SUCCESS_CONTENT_ICON_TEST_ID}
          name={IconName.CheckBold}
          size={IconSize.Xl}
          color={IconColor.Success}
        />
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={styles.title}
        >
          {strings('hardware_wallet.success.title', { device: deviceName })}
        </Text>
      </View>
    </View>
  );
};

export default SuccessContent;

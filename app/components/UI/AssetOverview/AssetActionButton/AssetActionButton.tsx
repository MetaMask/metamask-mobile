import React, { ReactNode } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon, {
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import Device from '../../../../util/device';
import { useTheme } from '../../../../util/theme';
import Text from '../../../Base/Text';
import generateTestId from '../../../../../wdio/utils/generateTestId';

const createStyles = (colors: any) =>
  StyleSheet.create({
    button: {},
    disabledButton: {
      opacity: 0.5,
    },
    buttonIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 100,
      paddingTop: Device.isAndroid() ? 2 : 4,

      display: 'flex',
      justifyContent: 'center',
      alignContent: 'center',
      backgroundColor: colors.primary.muted,

      alignItems: 'center',
      flexShrink: 1,
      marginHorizontal: 5,
    },
    buttonIcon: {
      width: 18,
      height: 18,
      color: colors.primary.default,
    },
    buttonText: {
      marginTop: 8,
      marginHorizontal: 3,
      color: colors.primary.default,
      fontSize: 14,
    },
    receive: {
      right: Device.isIos() ? 1 : 0,
      bottom: 1,
      transform: [{ rotate: '90deg' }],
    },
    swapsIcon: {
      right: Device.isAndroid() ? 1 : 0,
      bottom: Device.isAndroid() ? 1 : 0,
    },
    buyIcon: {
      right: Device.isAndroid() ? 0.5 : 0,
      bottom: Device.isAndroid() ? 1 : 2,
    },
  });

interface AssetActionButtonProps {
  onPress?: () => void;
  icon?: string | ReactNode;
  label?: string;
  disabled?: boolean;
  testID?: string;
}

const AssetActionButton = ({
  onPress,
  icon,
  label,
  disabled,
  testID,
}: AssetActionButtonProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const maxStringLength = 10;

  const getIcon = (type: string) => {
    switch (type) {
      case 'send': {
        return <Icon name={IconName.Send1} style={styles.buttonIcon} />;
      }
      case 'receive': {
        return <Icon name={IconName.Received} style={styles.buttonIcon} />;
      }
      case 'add': {
        return <Icon name={IconName.Add} style={styles.buttonIcon} />;
      }
      case 'information': {
        return <Icon name={IconName.Info} style={styles.buttonIcon} />;
      }
      case 'swap': {
        return <Icon name={IconName.Swap} style={styles.buttonIcon} />;
      }
      case 'buy': {
        return <Icon name={IconName.Card} style={styles.buttonIcon} />;
      }
      default: {
        return null;
      }
    }
  };
  return (
    <TouchableOpacity
      {...generateTestId(Platform, testID)}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabledButton]}
      disabled={disabled}
    >
      <View style={styles.buttonIconWrapper}>
        {icon && (typeof icon === 'string' ? getIcon(icon) : icon)}
      </View>
      {label && (
        <Text centered style={styles.buttonText} numberOfLines={1}>
          {label.length > maxStringLength
            ? `${label.substring(0, maxStringLength - 3)}...`
            : label}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default AssetActionButton;

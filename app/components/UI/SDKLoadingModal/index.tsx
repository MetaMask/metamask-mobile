import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import Device from '../../../../app/util/device';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import AnimatedSpinner from '../AnimatedSpinner';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SDKLoadingModalrops {
  onCancel: () => void;
  onConfirm: () => void;
}

const createStyles = (colors: ThemeColors, _safeAreaInsets: EdgeInsets) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      paddingTop: 7,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: 50,
      paddingBottom: Device.isIphoneX() ? 20 : 0,
    },

    actionContainer: {
      flex: 0,
      flexDirection: 'row',
      paddingVertical: 16,
      paddingHorizontal: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    action: {
      marginLeft: 10,
    },
  });

export const SDKLoadingModal = (_props?: SDKLoadingModalrops) => {
  const safeAreaInsets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = createStyles(colors, safeAreaInsets);

  return (
    <View style={styles.root}>
      <View style={styles.actionContainer}>
        <AnimatedSpinner size={36} />
        <Text style={styles.action}>{strings('sdk.loading')}</Text>
      </View>
    </View>
  );
};

export default SDKLoadingModal;

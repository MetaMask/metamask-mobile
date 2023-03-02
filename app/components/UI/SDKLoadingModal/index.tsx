import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import LottieView from 'lottie-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import Device from '../../../../app/util/device';
import { useTheme } from '../../../util/theme';

interface SDKLoadingModalrops {
  onCancel: () => void;
  onConfirm: () => void;
}

const animationSize = Device.getDeviceWidth() / 2;

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
    animation: {
      width: animationSize,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export const SDKLoadingModal = (_props?: SDKLoadingModalrops) => {
  const safeAreaInsets = useSafeAreaInsets();
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors, safeAreaInsets);
  const animatedLogo =
    themeAppearance === 'light'
      ? // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./logo-light.json')
      : // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./logo-dark.json');

  return (
    <View style={styles.root}>
      <View style={styles.actionContainer}>
        <LottieView
          style={styles.animation}
          autoPlay
          loop
          source={animatedLogo}
        />
        {/* TODO remove text from animation and use <Text> instead. */}
      </View>
    </View>
  );
};

export default SDKLoadingModal;

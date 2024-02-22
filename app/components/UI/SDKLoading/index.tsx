/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import/no-commonjs */
import { ThemeColors } from '@metamask/design-tokens/dist/js/themes/types';
import LottieView from 'lottie-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';
import Device from '../../../../app/util/device';
import { useTheme, useAssetFromTheme } from '../../../util/theme';

const animationSize = Device.getDeviceWidth() / 2;

const loadingLight = require('./logo-light.json');
const loadingDark = require('./logo-dark.json');

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

export const SDKLoading = () => {
  const safeAreaInsets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = createStyles(colors, safeAreaInsets);
  const animatedLogo = useAssetFromTheme(loadingLight, loadingDark);

  return (
    <View style={styles.root}>
      <View style={styles.actionContainer}>
        <LottieView
          style={styles.animation}
          autoPlay
          loop
          source={animatedLogo}
        />
      </View>
    </View>
  );
};

export default SDKLoading;

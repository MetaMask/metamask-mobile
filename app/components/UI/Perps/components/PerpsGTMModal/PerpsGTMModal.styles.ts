import { Platform, StyleSheet } from 'react-native';
import { colors as importedColors } from '../../../../../styles/common';
import Device from '../../../../../util/device';
import { Theme } from '@metamask/design-tokens';

const createStyles = (theme: Theme, isDarkMode: boolean) =>
  StyleSheet.create({
    scroll: {
      flexGrow: 0,
    },
    wrapper: {
      alignItems: 'center',
      paddingTop: 32,
    },
    largeImageWrapper: {
      height: 330,
      alignItems: 'center',
    },
    title: {
      fontSize: Device.isLargeDevice() ? 50 : 45,
      lineHeight: Device.isLargeDevice() ? 50 : 46,
      textAlign: 'center',
      paddingTop: Device.isLargeDevice() ? 45 : 30,
      paddingHorizontal: 16,
      fontFamily: Platform.OS === 'ios' ? 'MM Poly' : 'MM Poly Regular',
      ...(Platform.OS === 'ios' ? { fontWeight: '900' } : {}),
    },
    titleDescription: {
      paddingTop: 16,
      paddingHorizontal: Device.isLargeDevice() ? 5 : 10,
      textAlign: 'center',
      fontSize: 16,
      fontFamily: 'Geist-Regular',
      fontWeight: '500',
    },
    image: {
      height: Device.isLargeDevice() ? 500 : 380,
    },
    ctas: {
      flex: 1,
      position: 'relative',
      width: '100%',
      paddingHorizontal: 30,
    },
    createWrapper: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      rowGap: 5,
      marginBottom: 40,
      paddingHorizontal: 30,
    },
    tryNowButton: {
      borderRadius: 12,
      backgroundColor: isDarkMode
        ? importedColors.white
        : importedColors.btnBlack,
    },
    tryNowButtonText: {
      color: isDarkMode ? importedColors.btnBlack : importedColors.white,
      fontWeight: '600',
      fontSize: 16,
    },
    notNowButton: {
      borderRadius: 12,
      backgroundColor: theme.colors.background.default,
      borderWidth: 1,
      borderColor: importedColors.transparent,
    },
    notNowButtonText: {
      fontWeight: '500',
      fontSize: 16,
    },
  });

export default createStyles;

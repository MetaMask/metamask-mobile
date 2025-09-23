import { Platform, StyleSheet } from 'react-native';
import { colors as importedColors } from '../../../../../styles/common';
import Device from '../../../../../util/device';
import { Theme } from '@metamask/design-tokens';

const createStyles = (theme: Theme, isDarkMode: boolean) =>
  StyleSheet.create({
    pageContainer: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    contentContainer: {
      alignItems: 'center',
      paddingTop: 56,
      flexGrow: 1,
    },
    image: {
      flexShrink: 1,
      marginTop: 20,
      width: '100%',
    },
    title: {
      fontSize: Device.isLargeDevice() ? 50 : 45,
      lineHeight: Device.isLargeDevice() ? 50 : 46,
      textAlign: 'center',
      paddingTop: Device.isLargeDevice() ? 0 : 30,
      paddingHorizontal: 16,
      fontFamily: Platform.OS === 'ios' ? 'MM Poly' : 'MM Poly Regular',
      ...(Platform.OS === 'ios' ? { fontWeight: '900' } : {}),
    },
    titleDescription: {
      paddingTop: 10,
      paddingHorizontal: Device.isLargeDevice() ? 5 : 10,
      marginBottom: 16,
      textAlign: 'center',
      fontSize: 16,
      fontFamily: 'Geist-Regular',
      fontWeight: '500',
    },
    ctas: {
      flex: 1,
      width: '100%',
      paddingHorizontal: 30,
    },
    footerContainer: {
      display: 'flex',
      rowGap: 8,
      paddingHorizontal: 30,
      paddingBottom: Device.isLargeDevice() ? 0 : 12,
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

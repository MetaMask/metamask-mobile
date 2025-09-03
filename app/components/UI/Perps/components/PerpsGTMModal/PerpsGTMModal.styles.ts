import { StyleSheet } from 'react-native';
import { colors as importedColors } from '../../../../../styles/common';
import Device from '../../../../../util/device';
import { Theme } from '@metamask/design-tokens';

const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    scroll: {
      flexGrow: 0,
    },
    wrapper: {
      alignItems: 'center',
      paddingTop: 32,
    },
    largeFoxWrapper: {
      height: 330,
      alignItems: 'center',
    },
    title: {
      fontSize: 60,
      lineHeight: 60,
      textAlign: 'center',
      paddingTop: Device.isLargeDevice() ? 40 : 10,
      fontFamily: 'MM Poly Regular',
      color: importedColors.gettingStartedTextColor,
      fontWeight: '900',
      letterSpacing: -1,
    },
    titleDescription: {
      paddingTop: 20,
      textAlign: 'center',
      fontSize: 16,
      fontFamily: 'MM Sans Regular',
      color: importedColors.gettingStartedTextColor,
      fontWeight: '500',
    },
    foxImage: {
      height: Device.isLargeDevice() ? 350 : 260,
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
      marginBottom: 48,
      paddingHorizontal: 30,
    },
    learnMoreButton: {
      textDecorationLine: 'underline',
      fontFamily: 'MMSans-Regular',
      color: importedColors.gettingStartedTextColor,
      textAlign: 'center',
      paddingTop: 10,
    },
    tryNowButton: {
      borderRadius: 12,
      backgroundColor: importedColors.white,
    },
    tryNowButtonText: {
      color: importedColors.gettingStartedTextColor,
      fontWeight: '600',
      fontSize: 16,
    },
    notNowButton: {
      borderRadius: 12,
      backgroundColor: importedColors.transparent,
      borderWidth: 1,
      borderColor: importedColors.transparent,
    },
    notNowButtonText: {
      color: importedColors.gettingStartedTextColor,
      fontWeight: '500',
      fontSize: 16,
    },
  });

export default createStyles;

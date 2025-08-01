import { StyleSheet } from 'react-native';
import { colors as importedColors } from '../../../styles/common';
import Device from '../../../util/device';

const createStyles = () =>
  StyleSheet.create({
    scroll: {
      flexGrow: 1,
      minHeight: '100%',
    },
    wrapper: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 30,
      minHeight: '100%',
    },
    largeFoxWrapper: {
      alignItems: 'center',
    },
    title: {
      fontSize: 60,
      lineHeight: 60,
      textAlign: 'center',
      paddingTop: Device.isLargeDevice() ? 40 : 10,
      fontFamily: 'MM Poly Regular',
    },
    titleDescription: {
      paddingTop: 20,
      textAlign: 'center',
      fontSize: 16,
      fontFamily: 'MM Sans Regular',
    },
    foxImage: {
      height: Device.isLargeDevice() ? 350 : 260,
    },
    ctas: {
      flex: 1,
      position: 'relative',
      width: '100%',
      paddingHorizontal: 30,
      justifyContent: 'space-between',
    },
    createWrapper: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      rowGap: 5,
      marginBottom: 16,
    },
    learnMoreButton: {
      textDecorationLine: 'underline',
      fontFamily: 'MMSans-Regular',
      color: importedColors.gettingStartedTextColor,
      textAlign: 'center',
      paddingTop: 10,
    },
    importWalletButton: {
      borderRadius: 12,
      backgroundColor: importedColors.gettingStartedTextColor,
    },
    notNowButton: {
      borderRadius: 12,
      backgroundColor: importedColors.transparent,
      borderWidth: 1,
      borderColor: importedColors.transparent,
    },
  });

export default createStyles;

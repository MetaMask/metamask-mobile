import { StyleSheet } from 'react-native';
import Device from '../../../util/device';
import { fontStyles, colors as importedColors } from '../../../styles/common';

const createStyles = (colors: {
  background: { default: string };
  text: { default: string };
  primary: { default: string };
  border: { muted: string };
}) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    wrapper: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 30,
    },
    image: {
      alignSelf: 'center',
      width: Device.isLargeDevice() ? 300 : 220,
      height: Device.isLargeDevice() ? 300 : 220,
    },
    largeFoxWrapper: {
      alignItems: 'center',
      paddingTop: Device.isLargeDevice() ? 60 : 40,
      paddingBottom: Device.isLargeDevice() ? 100 : 40,
    },
    title: {
      fontSize: 50,
      lineHeight: 50,
      justifyContent: 'center',
      textAlign: 'center',
      paddingHorizontal: 60,
      paddingTop: 20,
      fontFamily: 'MMPoly-Regular',
    },
    titleDescription: {
      paddingTop: 10,
      textAlign: 'center',
      fontSize: 16,
      fontFamily: 'MMSans-Regular',
    },
    ctas: {
      flex: 1,
      position: 'relative',
      width: '100%',
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    createWrapper: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'flex-end',
      rowGap: 16,
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

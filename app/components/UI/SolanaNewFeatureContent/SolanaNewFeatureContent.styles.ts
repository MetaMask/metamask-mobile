import { StyleSheet } from 'react-native';
import { colors as importedColors } from '../../../styles/common';

const createStyles = () => StyleSheet.create({
    scroll: {
      flex: 1,
    },
    wrapper: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 30,
    },
    largeFoxWrapper: {
      alignItems: 'center',
      paddingTop: 10,
    },
    title: {
      fontSize: 60,
      lineHeight: 60,
      textAlign: 'center',
      paddingTop: 60,
      fontFamily: 'MMPoly-Regular',
    },
    titleDescription: {
      paddingTop: 20,
      textAlign: 'center',
      fontSize: 16,
      fontFamily: 'MMSans-Regular',
    },
    foxImage: {
      height: 350,
    },
    ctas: {
      flex: 1,
      position: 'relative',
      width: '100%',
      paddingHorizontal: 30,
    },
    createWrapper: {
      flex: 1,
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

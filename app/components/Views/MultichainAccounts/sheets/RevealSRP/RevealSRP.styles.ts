// Third party dependencies.
import { Insets, Platform, StatusBar, StyleSheet } from 'react-native';

const styleSheet = (params: { vars: { insets: Insets } }) => {
  const { vars } = params;
  const { insets } = vars;

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      paddingBottom: Platform.OS === 'android' ? 10 : insets.bottom,
    },
    headerContainer: {
      paddingHorizontal: 16,
    },
    contentContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 'auto',
      paddingLeft: 16,
      paddingRight: 16,
      gap: 16,
    },
    securityQuizLockImage: {
      marginTop: 46,
      marginBottom: 46,
      marginLeft: 60,
      marginRight: 60,
    },
    buttonContainer: {
      marginTop: 'auto',
      marginBottom: Platform.OS === 'android' ? 12 : 0,
      paddingLeft: 16,
      paddingRight: 16,
      gap: 16,
    },
    button: {
      width: '100%',
    },
  });
};

export default styleSheet;

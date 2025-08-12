// Third party dependencies.
import { Platform, StatusBar, StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingLeft: 16,
      paddingRight: 16,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    headerContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 16,
      paddingRight: 16,
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
      paddingLeft: 16,
      paddingRight: 16,
      gap: 16,
    },
    button: {
      width: '100%',
    },
  });

export default styleSheet;

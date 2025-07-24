import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    wrapper: {
      paddingTop: 8,
    },
    spinner: {
      marginVertical: 32,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    account_info: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    account_name: {
      marginBottom: -8,
      marginTop: 8,
    },
    backIcon: {
      left: 28,
      position: 'absolute',
      top: 18,
    },
  });

export default styleSheet;

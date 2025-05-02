import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    wrapper: {
      marginTop: 24,
      marginBottom: 16,
    },
    account_info: {
      flexDirection: 'column',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    account_name: {
      marginTop: 8,
    },
  });

export default styleSheet;

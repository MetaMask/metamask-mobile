import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    wrapper: {
      marginBottom: 16,
      marginTop: 24,
    },
    account_info: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    account_name: {
      marginTop: 8,
    },
  });

export default styleSheet;

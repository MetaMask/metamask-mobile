import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    wrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 4,
      width: '100%',
    },
    left_section: {
      flexDirection: 'row',
    },
    name_section: {
      flexDirection: 'column',
      marginLeft: 16,
    },
    network_name: {
      width: 170,
    },
    button_section: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      width: 100,
    },
    multichain_accounts_row_wrapper: {
      width: '100%',
      marginBottom: 8,
    },
  });

export default styleSheet;

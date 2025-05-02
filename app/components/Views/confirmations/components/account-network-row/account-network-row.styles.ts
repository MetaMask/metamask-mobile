import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    wrapper: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 32,
    },
    left_section: {
      flexDirection: 'row',
    },
    name_section: {
      flexDirection: 'column',
      marginLeft: 16,
    },
  });

export default styleSheet;

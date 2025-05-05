import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    wrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 32,
      paddingVertical: 4,
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

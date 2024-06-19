import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 1,
      flexWrap: 'wrap',
    },
    pillContainer: {
      flexDirection: 'column',
      gap: 1,
      marginLeft: 'auto',
      minWidth: 0,
    },
    pills: {
      flexDirection: 'row',
      gap: 4,
    },
  });

export default styleSheet;

import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    rootContainer: {
      flexDirection: 'row',
      paddingVertical: 8,
      justifyContent: 'space-between',
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    labelColumn: {
      flexDirection: 'column',
      justifyContent: 'center',
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
  });

export default styleSheet;

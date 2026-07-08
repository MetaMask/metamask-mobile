import { StyleSheet } from 'react-native';

export const styleSheet = () =>
  StyleSheet.create({
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    valueContainer: {
      flexDirection: 'row',
      gap: 8,
      flex: 1,
      marginLeft: 16,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    valueText: {
      textAlign: 'right',
      flex: 1,
      flexWrap: 'wrap',
    },
  });

export default styleSheet;

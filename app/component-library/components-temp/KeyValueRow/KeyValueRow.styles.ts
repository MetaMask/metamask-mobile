import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    rootContainer: {
      flexDirection: 'row',
      paddingVertical: 8,
      justifyContent: 'space-between',
      alignItems: 'center',
      overflow: 'hidden',
    },
    keyValueSection: {
      flex: 1,
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    flexRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });

export default styleSheet;

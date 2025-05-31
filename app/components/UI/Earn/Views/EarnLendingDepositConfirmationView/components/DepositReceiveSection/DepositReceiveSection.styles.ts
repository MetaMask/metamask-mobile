import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    infoSectionContent: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      gap: 16,
    },
    receiveRow: {
      flexDirection: 'row',
    },
    receiveTokenIcon: {
      marginRight: 8,
    },
    receiptTokenRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    receiptTokenRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    receiptTokenRowRight: {
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
  });

export default styleSheet;

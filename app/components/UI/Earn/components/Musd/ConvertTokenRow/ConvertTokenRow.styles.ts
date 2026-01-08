import { StyleSheet } from 'react-native';

const styleSheet = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    tokenInfo: {
      flex: 1,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingLeft: 12,
    },
    actionButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    spinnerContainer: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default styleSheet;

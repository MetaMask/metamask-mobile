// Third party dependencies.
import { StyleSheet } from 'react-native';

/**
 * Style sheet function for WalletActions component.
 *
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    actionsContainer: {
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    firstActionContainer: { marginVertical: 32 },
    otherActionContainer: {
      marginBottom: 32,
    },
    icon: {
      marginHorizontal: 16,
    },
  });

export default styleSheet;

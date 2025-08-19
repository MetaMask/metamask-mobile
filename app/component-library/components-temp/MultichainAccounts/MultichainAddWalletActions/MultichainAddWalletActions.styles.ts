// Third party dependencies.
import { StyleSheet } from 'react-native';

/**
 * Style sheet function for MultichainAddWalletActions component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    subHeaders: {
      marginHorizontal: 16,
      marginTop: 24,
      marginBottom: 8,
    },
    accountAction: {
      paddingVertical: 16,
    },
  });

export default styleSheet;

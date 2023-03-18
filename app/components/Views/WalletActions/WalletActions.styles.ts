// Third party dependencies.
import { StyleSheet } from 'react-native';

/**
 * Style sheet function for SheetBottom component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
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
  });

export default styleSheet;

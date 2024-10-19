// Third party dependencies.
import { StyleSheet } from 'react-native';

/**
 * Style sheet function for AvatarIcon component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    balancesContainer: {
      alignItems: 'flex-end',
    },
    balanceLabel: { textAlign: 'right' },
  });

export default styleSheet;

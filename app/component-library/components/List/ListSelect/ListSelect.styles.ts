// Third party dependencies.
import { StyleSheet } from 'react-native';

/**
 * Style sheet function for ListSelect component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    listItem: {
      padding: 0,
    },
  });

export default styleSheet;

// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.

/**
 * Style sheet function for ListMultiSelect component.
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

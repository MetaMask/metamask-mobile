import { StyleSheet } from 'react-native';

/**
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    section: {
      paddingTop: 32,
    },
  });
export default styleSheet;

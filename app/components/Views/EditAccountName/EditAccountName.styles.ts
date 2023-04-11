// Third party dependencies.
import { StyleSheet } from 'react-native';

/**
 * Style sheet function for TabBarItem component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = () =>
  StyleSheet.create({
    headerRight: { marginRight: 20 },
    screen: { flex: 1, marginHorizontal: 16, justifyContent: 'space-between' },
    inputContainer: { marginTop: 24 },
    buttonsContainer: { flexDirection: 'row' },
    cancelButton: { flex: 1, marginRight: 8 },
    saveButton: { flex: 1, marginLeft: 8 },
    saveButtonDisabled: { flex: 1, marginLeft: 8, opacity: 0.5 },
  });
export default styleSheet;

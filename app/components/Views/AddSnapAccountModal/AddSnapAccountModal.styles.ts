// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for AddSnapAccountModal component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    content: {
      flex: 1,
      padding: 24,
      backgroundColor: colors.background.default,
    },
    title: {
      marginBottom: 16,
    },
    inputContainer: { marginTop: 24 },
    inputsContainer: { flex: 1, marginHorizontal: 16 },
    buttonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    button: {
      flex: 1,
    },
    cancelButton: {
      marginRight: 8,
    },
    confirmButton: {
      marginLeft: 8,
    },
    error: {
      color: colors.error.default,
      marginTop: 8,
    },
  });
};

export default styleSheet;

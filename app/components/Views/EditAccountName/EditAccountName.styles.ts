// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for EditAccountName component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;
  return StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    inputsContainer: { flex: 1, marginHorizontal: 16 },
    inputContainer: { marginTop: 24 },
    buttonsContainer: {
      flexDirection: 'row',
      marginHorizontal: 16,
    },
    cancelButton: { flex: 1, marginRight: 8 },
    saveButton: { flex: 1, marginLeft: 8 },
    saveButtonDisabled: { opacity: 0.5 },
  });
};
export default styleSheet;

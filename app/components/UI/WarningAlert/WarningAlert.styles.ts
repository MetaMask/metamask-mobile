// Third party dependencies.
import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

/**
 * Style sheet function for ModalConfirmation component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    alertContainer: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 20,
      borderRadius: 8,
      backgroundColor: colors.background.default,
      borderColor: colors.warning.default,
    },
    upperAlertContainer: { bottom: 120 },
    alertWrapper: {
      flex: 1,
      padding: 14,
    },

    alertText: {
      lineHeight: 18,
      color: colors.text.default,
      paddingLeft: 4,
    },
    alertIcon: {
      paddingRight: 4,
    },
  });
};

export default styleSheet;

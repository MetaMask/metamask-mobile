// Third party dependencies.
import { StyleSheet as RNStyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

/**
 * Style sheet function for AssetDetailsActionsBottomSheet component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return RNStyleSheet.create({
    actionsContainer: {
      paddingVertical: 16,
      paddingHorizontal: 16,
    },
    icon: {
      color: colors.primary.inverse,
    },
  });
};

export default styleSheet;

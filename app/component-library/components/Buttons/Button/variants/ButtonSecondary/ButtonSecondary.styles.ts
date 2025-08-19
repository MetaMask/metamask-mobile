// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { ButtonSecondaryStyleSheetVars } from './ButtonSecondary.types';

/**
 * Style sheet function for ButtonSecondary component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: ButtonSecondaryStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, isDanger, isInverse, pressed } = vars;

  // Determine background colors based on state combinations
  let backgroundColor: string;
  let borderColor: string;

  if (isInverse && isDanger) {
    // Inverse + Danger: colors.background.default → colors.background.defaultPressed
    backgroundColor = pressed
      ? colors.background.defaultPressed
      : colors.background.default;
    borderColor = pressed
      ? colors.background.defaultPressed
      : colors.background.default;
  } else if (isInverse) {
    // Inverse: transparent → colors.background.pressed
    backgroundColor = pressed ? colors.background.pressed : 'transparent';
    borderColor = colors.primary.inverse;
  } else {
    // Default and Danger: colors.background.muted → colors.background.mutedPressed
    backgroundColor = pressed
      ? colors.background.mutedPressed
      : colors.background.muted;
    borderColor = 'transparent';
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor,
        borderWidth: 1,
        borderColor,
      },
      StyleSheet.flatten(style),
    ) as ViewStyle,
  });
};

export default styleSheet;

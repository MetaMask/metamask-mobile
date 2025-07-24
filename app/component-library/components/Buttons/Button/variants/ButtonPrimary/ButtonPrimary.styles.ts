// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { ButtonPrimaryStyleSheetVars } from './ButtonPrimary.types';

/**
 * Style sheet function for ButtonPrimary component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: ButtonPrimaryStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { colors } = theme;
  const { style, isDanger, isInverse, pressed } = vars;

  // Determine background colors based on state combinations
  let backgroundColor: string;

  if (isInverse) {
    // Inverse and Inverse + Danger both use background tokens
    backgroundColor = pressed
      ? colors.background.defaultPressed
      : colors.background.default;
  } else if (isDanger) {
    // Danger state uses error tokens
    backgroundColor = pressed
      ? colors.error.defaultPressed
      : colors.error.default;
  } else {
    // Default Primary uses icon tokens
    backgroundColor = pressed
      ? colors.icon.defaultPressed
      : colors.icon.default;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        backgroundColor,
      },
      StyleSheet.flatten(style),
    ) as ViewStyle,
  });
};

export default styleSheet;

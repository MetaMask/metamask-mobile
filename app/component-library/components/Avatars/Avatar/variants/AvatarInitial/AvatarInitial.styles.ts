// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { AvatarInitialStyleSheetVars } from './AvatarInitial.types';

/**
 * Style sheet function for AvatarInitial component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarInitialStyleSheetVars;
}) => {
  const { vars, theme } = params;
  const { size, initialColor, backgroundColor } = vars;
  const themedInitialColor = initialColor || theme.colors.text.default;
  const themedBackgroundColor =
    backgroundColor || theme.colors.background.alternative;

  return StyleSheet.create({
    base: {
      width: Number(size),
      height: Number(size),
      borderRadius: Number(size) / 2,
      backgroundColor: themedBackgroundColor,
      justifyContent: 'center',
      alignItems: 'center',
      borderColor: theme.colors.border.muted,
      borderWidth: 1,
    },
    initial: {
      color: themedInitialColor,
    },
  });
};

export default styleSheet;

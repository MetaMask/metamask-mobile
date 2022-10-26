// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

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
  const { colors } = theme;
  const { style, size } = vars;
  return StyleSheet.create({
    base: Object.assign(
      {
        width: Number(size),
        height: Number(size),
        borderRadius: Number(size) / 2,
        backgroundColor: colors.background.alternative,
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: colors.border.muted,
        borderWidth: 1,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

// Third party dependencies.
import { StyleSheet, ViewStyle, ImageStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { AvatarImageStyleSheetVars } from './AvatarImage.types';

/**
 * Style sheet function for AvatarImage component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarImageStyleSheetVars;
}) => {
  const { vars } = params;
  const { style, size } = vars;
  return StyleSheet.create({
    base: Object.assign({} as ViewStyle, style) as ViewStyle,
    image: Object.assign(
      {
        width: Number(size),
        height: Number(size),
      } as ImageStyle,
      style,
    ) as ImageStyle,
  });
};

export default styleSheet;

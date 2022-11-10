// Third party dependencies.
import { StyleSheet, ImageStyle } from 'react-native';

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
  const { size } = vars;
  return StyleSheet.create({
    image: Object.assign({
      width: Number(size),
      height: Number(size),
      borderRadius: Number(size) / 2,
    } as ImageStyle),
  });
};

export default styleSheet;

// Third party dependencies.
import { StyleSheet, ImageStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { AvatarBlockiesStyleSheetVars } from './AvatarBlockies.types';

/**
 * Style sheet function for AvatarBlockies component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarBlockiesStyleSheetVars;
}) => {
  const { vars } = params;
  const { size } = vars;
  return StyleSheet.create({
    image: Object.assign({
      width: Number(size),
      height: Number(size),
    } as ImageStyle),
  });
};

export default styleSheet;

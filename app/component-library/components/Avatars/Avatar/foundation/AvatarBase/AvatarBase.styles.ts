// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { AvatarBaseStyleSheetVars } from './AvatarBase.types';
import { DEFAULT_AVATAR_BASE_BACKGROUND_COLOR } from './AvatarBase.constants';

/**
 * Style sheet function for AvatarBase component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarBaseStyleSheetVars;
}) => {
  const {
    theme,
    vars: { style, size, backgroundColor },
  } = params;
  const sizeAsNum = Number(size);
  const themedBackgroundColor =
    backgroundColor === DEFAULT_AVATAR_BASE_BACKGROUND_COLOR
      ? theme.colors.background.default
      : backgroundColor;

  return StyleSheet.create({
    base: Object.assign(
      {
        height: sizeAsNum,
        width: sizeAsNum,
        borderRadius: sizeAsNum / 2,
        overflow: 'hidden',
        backgroundColor: themedBackgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../../../util/theme/models';

// Internal dependencies.
import { AvatarBaseBaseStyleSheetVars } from './AvatarBaseBase.types';

/**
 * Style sheet function for AvatarBaseBase component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarBaseBaseStyleSheetVars;
}) => {
  const {
    theme,
    vars: { style, size },
  } = params;
  const sizeAsNum = Number(size);

  return StyleSheet.create({
    base: Object.assign(
      {
        height: sizeAsNum,
        width: sizeAsNum,
        borderRadius: sizeAsNum / 2,
        overflow: 'hidden',
        backgroundColor: theme.colors.background.default,
        justifyContent: 'center',
        alignItems: 'center',
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

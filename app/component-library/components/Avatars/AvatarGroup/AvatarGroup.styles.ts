// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { AvatarGroupStyleSheetVars } from './AvatarGroup.types';
import { OVERFLOWTEXTMARGIN_BY_AVATARSIZE } from './AvatarGroup.constants';

/**
 * Style sheet function for AvatarGroup component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarGroupStyleSheetVars;
}) => {
  const { vars } = params;
  const { style, size } = vars;

  return StyleSheet.create({
    base: Object.assign(
      {
        flexDirection: 'row',
        alignItems: 'center',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    textStyle: {
      marginLeft: OVERFLOWTEXTMARGIN_BY_AVATARSIZE[size],
    },
  });
};

export default styleSheet;

// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import {
  BadgeAvatarPosition,
  BadgeAvatarStyleSheetVars,
} from './BadgeAvatar.types';

/**
 * Style sheet function for Badge component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: BadgeAvatarStyleSheetVars;
}) => {
  const { vars } = params;
  const { style, position } = vars;
  let badgePosition: ViewStyle = {};

  switch (position) {
    case BadgeAvatarPosition.TopRight: {
      badgePosition = {
        top: '-12.5%',
        right: '-12.5%',
      };
      break;
    }
    case BadgeAvatarPosition.BottomRight: {
      badgePosition = {
        right: '-12.5%',
        bottom: '-12.5%',
      };
      break;
    }
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        ...badgePosition,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

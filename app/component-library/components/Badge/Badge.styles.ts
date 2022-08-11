import { StyleSheet, ViewStyle } from 'react-native';
import {
  BadgeCustomPosition,
  BadgePositionVariant,
  BadgeStyleSheetVars,
} from './Badge.types';
import { Theme } from '../../../util/theme/models';
import { DEFAULT_BADGE_POSITION } from './Badge.constants';

/**
 * Style sheet function for Badge component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: BadgeStyleSheetVars }) => {
  const { vars } = params;
  const { style, position } = vars;

  let finalPosition: BadgeCustomPosition;

  switch (position) {
    case BadgePositionVariant.TopRight: {
      finalPosition = {
        ...DEFAULT_BADGE_POSITION,
        top: -4,
        right: -4,
      };
      break;
    }
    case BadgePositionVariant.BottomRight: {
      finalPosition = {
        ...DEFAULT_BADGE_POSITION,
        bottom: -4,
        right: -4,
      };
      break;
    }
    default: {
      finalPosition = {
        ...DEFAULT_BADGE_POSITION,
        ...position,
      };
      break;
    }
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        alignSelf: 'flex-start',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    badgeContent: {
      position: 'absolute',
      top: finalPosition.top,
      right: finalPosition.right,
      bottom: finalPosition.bottom,
      left: finalPosition.left,
    },
    children: {},
  });
};

export default styleSheet;

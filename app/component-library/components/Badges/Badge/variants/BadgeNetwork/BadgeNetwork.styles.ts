// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import {
  BadgeNetworkPosition,
  BadgeNetworkStyleSheetVars,
} from './BadgeNetwork.types';

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
  vars: BadgeNetworkStyleSheetVars;
}) => {
  const { vars } = params;
  const { style, position } = vars;
  let badgePosition: ViewStyle = {};

  switch (position) {
    case BadgeNetworkPosition.TopRight: {
      badgePosition = {
        top: -4,
        right: -4,
      };
      break;
    }
    case BadgeNetworkPosition.BottomRight: {
      badgePosition = {
        right: -4,
        bottom: -4,
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

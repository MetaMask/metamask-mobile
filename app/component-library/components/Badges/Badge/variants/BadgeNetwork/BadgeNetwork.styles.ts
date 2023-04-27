// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';

// Internal dependencies.
import { DEFAULT_BADGENETWORK_NETWORKICON_SIZE } from './BadgeNetwork.constants';
import { BadgeNetworkStyleSheetVars } from './BadgeNetwork.types';

/**
 * Style sheet function for BadgeNetwork component.
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
  const { style, containerSize } = vars;
  let scaleRatio = 1;
  let opacity = 0;
  if (containerSize) {
    scaleRatio =
      containerSize.height / Number(DEFAULT_BADGENETWORK_NETWORKICON_SIZE);
    opacity = 1;
  }

  return StyleSheet.create({
    base: Object.assign(
      {
        height: '50%',
        aspectRatio: 1,
        minHeight: 16,
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    networkIcon: {
      transform: [{ scale: scaleRatio }],
    },
  });
};

export default styleSheet;

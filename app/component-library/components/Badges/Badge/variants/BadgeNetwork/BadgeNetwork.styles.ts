// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../util/theme/models';
import { AvatarSize } from '../../../../Avatars/Avatar';

// Internal dependencies.
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
  const { theme, vars } = params;
  const { style, containerSize, size } = vars;
  /**
   * Design Requirements:
   * - The Network Badge needs to be 1/2 the height of its content.
   * - It needs to have a 1px stroke on a 16px badge.
   * (Current) Solution:
   * - Use invisible base wrapper and set height to 50% to get the 1/2 height measurement.
   * - Scale content to a scale ratio based on the container size's height.
   * - Set borderWidth to scale with given Network Icon size (always given with default).
   */
  const badgeToContentScaleRatio = 0.5;
  const borderWidthRatio = 1 / 16;
  const borderWidth = Number(size) * borderWidthRatio;
  const currentSmallestAvatarSize = Math.min(
    ...Object.values(AvatarSize).map((avatarSize) => Number(avatarSize)),
  );
  let scaleRatio = 1;
  let opacity = 0;

  if (containerSize) {
    scaleRatio = containerSize.height / Number(size);
    // This is so that the BadgeNetwork won't be visible until a containerSize is known
    opacity = 1;
  }

  return StyleSheet.create({
    base: {
      height: `${(badgeToContentScaleRatio * 100).toString()}%`,
      aspectRatio: 1,
      minHeight: currentSmallestAvatarSize * badgeToContentScaleRatio,
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
    },
    networkIcon: Object.assign(
      {
        /**
         * This is to make sure scale the Network Icon.
         * If the BadgeNetwork needs to have style changes specifically with dimensions,
         * set transform to [{scale: 1}] first
         */
        transform: [{ scale: scaleRatio }],
        borderWidth,
        borderColor: theme.colors.background.default,
        ...theme.shadows.size.xs,
      } as ViewStyle,
      style,
    ) as ViewStyle,
  });
};

export default styleSheet;

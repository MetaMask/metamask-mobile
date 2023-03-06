// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import { BadgeAnchorElementShape, BadgePosition } from './BadgeWrapper.types';

/**
 * Style sheet function for Badge component.
 *
 * @param params Style sheet params.
 * @param params.theme App theme from ThemeContext.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { theme: Theme; vars: any }) => {
  const { vars } = params;
  const {
    style,
    anchorElementShape,
    badgePosition,
    badgePositionObj,
    elementHeight,
  } = vars;
  let anchoringOffset, positionObj, xOffset, yOffset;
  switch (anchorElementShape) {
    case BadgeAnchorElementShape.Circular:
      anchoringOffset = elementHeight * 0.14;
      break;
    case BadgeAnchorElementShape.Rectangular:
      anchoringOffset = 0;
      break;
    default:
      anchoringOffset = 0;
      break;
  }

  if (!badgePositionObj) {
    switch (badgePosition) {
      case BadgePosition.TopRight:
        positionObj = {
          top: anchoringOffset,
          right: anchoringOffset,
        };
        xOffset = elementHeight / 2;
        yOffset = elementHeight / -2;
        break;
      case BadgePosition.BottomRight:
        positionObj = {
          bottom: anchoringOffset,
          right: anchoringOffset,
        };
        xOffset = elementHeight / 2;
        yOffset = elementHeight / 2;
        break;
      case BadgePosition.BottomLeft:
        positionObj = {
          bottom: anchoringOffset,
          left: anchoringOffset,
        };
        xOffset = elementHeight / -2;
        yOffset = elementHeight / 2;
        break;
      case BadgePosition.TopLeft:
        positionObj = {
          top: anchoringOffset,
          left: anchoringOffset,
        };
        xOffset = elementHeight / -2;
        yOffset = elementHeight / -2;
        break;
      default:
        positionObj = {
          top: 'auto',
          right: 'auto',
        };
        xOffset = elementHeight / 2;
        yOffset = elementHeight / -2;
        break;
    }
  } else {
    positionObj = badgePositionObj;
    xOffset = 0;
    yOffset = 0;
  }

  return StyleSheet.create({
    base: Object.assign(
      { position: 'relative', alignSelf: 'flex-start' } as ViewStyle,
      style,
    ) as ViewStyle,
    badge: {
      position: 'absolute',
      height: elementHeight,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      ...positionObj,
      transform: [{ translateX: xOffset }, { translateY: yOffset }],
    },
  });
};

export default styleSheet;

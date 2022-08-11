// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// Internal dependencies.
import {
  AvatarBaseStyleSheetVars,
  AvatarBadgePositionVariant,
} from './AvatarBase.types';

/**
 * Style sheet function for AvatarBase component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: { vars: AvatarBaseStyleSheetVars }) => {
  const {
    vars: { style, size, badgePosition },
  } = params;
  const sizeAsNum = Number(size);
  let position;

  switch (badgePosition) {
    case AvatarBadgePositionVariant.TopRight: {
      position = {
        top: -4,
        right: -4,
        bottom: 'auto',
        left: 'auto',
      };
      break;
    }
    case AvatarBadgePositionVariant.BottomRight: {
      position = {
        top: 'auto',
        right: -4,
        bottom: -4,
        left: 'auto',
      };
      break;
    }
    default: {
      position = {
        top: 'auto',
        right: 'auto',
        bottom: 'auto',
        left: 'auto',
      };
    }
  }

  return StyleSheet.create({
    container: Object.assign(
      {
        height: sizeAsNum,
        width: sizeAsNum,
        borderRadius: sizeAsNum / 2,
        overflow: 'hidden',
        backgroundColor: 'white',
      } as ViewStyle,
      style,
    ) as ViewStyle,
    badgeContent: {
      top: position.top,
      right: position.right,
      bottom: position.bottom,
      left: position.left,
      width: 16,
      height: 16,
      borderRadius: 8,
      overflow: 'hidden',
    },
  });
};

export default styleSheet;

// Third party dependencies.
import { StyleSheet, ViewStyle } from 'react-native';

// External dependencies.
import { Theme } from '../../../../util/theme/models';

// Internal dependencies.
import {
  AvatarBaseSize,
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
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarBaseStyleSheetVars;
}) => {
  const {
    theme,
    vars: { style, size, badge },
  } = params;
  const sizeAsNum = Number(size);
  const badgeSize = Number(AvatarBaseSize.Xs);
  let position;

  switch (badge?.position) {
    case AvatarBadgePositionVariant.TopRight: {
      position = {
        top: -4,
        right: -4,
      };
      break;
    }
    case AvatarBadgePositionVariant.BottomRight: {
      position = {
        right: -4,
        bottom: -4,
      };
      break;
    }
    default: {
      position = {
        top: -4,
        right: -4,
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
        backgroundColor: theme.colors.background.default,
      } as ViewStyle,
      style,
    ) as ViewStyle,
    badgeContent: {
      ...position,
      width: badgeSize,
      height: badgeSize,
      borderRadius: badgeSize / 2,
      overflow: 'hidden',
    },
  });
};

export default styleSheet;

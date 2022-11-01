// Third party dependencies.
import { StyleSheet } from 'react-native';

// External dependencies.
import { Theme } from '../../../../../../../../util/theme/models';
import { AvatarBadgePositions } from '../../../../Avatar.types';

// Internal dependencies.
import { AvatarBaseWithBadgeStyleSheetVars } from './AvatarBaseWithBadge.types';

/**
 * Style sheet function for AvatarBaseWithBadge component.
 *
 * @param params Style sheet params.
 * @param params.vars Inputs that the style sheet depends on.
 * @returns StyleSheet object.
 */
const styleSheet = (params: {
  theme: Theme;
  vars: AvatarBaseWithBadgeStyleSheetVars;
}) => {
  const {
    vars: { size, badgePosition },
  } = params;
  const sizeAsNum = Number(size);
  let badgePositions;
  const positionOffset = 0.125;
  const scaledPositionOffset = sizeAsNum * -(0.25 + positionOffset);

  switch (badgePosition) {
    case AvatarBadgePositions.TopRight:
      badgePositions = {
        top: scaledPositionOffset,
        right: scaledPositionOffset,
      };
      break;
    case AvatarBadgePositions.BottomRight:
      badgePositions = {
        bottom: scaledPositionOffset,
        right: scaledPositionOffset,
      };
      break;
  }

  return StyleSheet.create({
    badge: {
      transform: [{ scale: 0.5 }],
      ...badgePositions,
    },
  });
};

export default styleSheet;

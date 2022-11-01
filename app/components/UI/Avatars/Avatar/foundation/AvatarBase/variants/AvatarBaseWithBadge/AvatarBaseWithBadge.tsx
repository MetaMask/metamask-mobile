/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../../../hooks/useStyles';
import {
  DEFAULT_AVATAR_BADGE_POSITION,
  DEFAULT_AVATAR_SIZE,
} from '../../../../Avatar.constants';
import BadgeWrapper from '../../../../../../../../component-library/components/Badges/BadgeWrapper';
import AvatarBaseBase from '../../foundation/AvatarBaseBase';

// Internal dependencies.
import { AvatarBaseWithBadgeProps } from './AvatarBaseWithBadge.types';
import styleSheet from './AvatarBaseWithBadge.styles';

const AvatarBaseWithBadge: React.FC<AvatarBaseWithBadgeProps> = ({
  size = DEFAULT_AVATAR_SIZE,
  badgeProps,
  badgePosition = DEFAULT_AVATAR_BADGE_POSITION,
  style,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    size,
    badgePosition,
    style,
  });
  badgeProps.avatarProps.size = size;
  badgeProps.style = styles.badge;

  return (
    <BadgeWrapper badgeProps={badgeProps}>
      <AvatarBaseBase size={size} {...props} />
    </BadgeWrapper>
  );
};

export default AvatarBaseWithBadge;

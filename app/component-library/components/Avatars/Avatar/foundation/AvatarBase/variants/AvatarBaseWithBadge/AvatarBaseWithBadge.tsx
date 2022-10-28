/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../../../hooks/useStyles';
import {
  DEFAULT_AVATAR_SIZE,
  DEFAULT_AVATAR_BADGE_POSITION,
} from '../../../../Avatar.constants';
import BadgeWrapper from '../../../../../../Badges/BadgeWrapper';

// Internal dependencies.
import { AvatarBaseWithBadgeProps } from './AvatarBaseWithBadge.types';
import styleSheet from './AvatarBaseWithBadge.styles';
import { AVATAR_BASE_WITH_BADGE_TEST_ID } from './AvatarBaseWithBadge.constants';

const AvatarBaseWithBadge: React.FC<AvatarBaseWithBadgeProps> = ({
  size = DEFAULT_AVATAR_SIZE,
  includeBadge = false,
  badgeProps,
  badgePosition = DEFAULT_AVATAR_BADGE_POSITION,
  style,
  children,
}) => {
  const { styles } = useStyles(styleSheet, {
    size,
    badgePosition,
    style,
  });
  const renderAvatarBaseWithBadge = () => (
    <View style={styles.base} testID={AVATAR_BASE_WITH_BADGE_TEST_ID}>
      {children}
    </View>
  );
  badgeProps.avatarProps.size = size;
  badgeProps.style = styles.badge;

  return (
    <>
      {includeBadge && !!badgeProps ? (
        <BadgeWrapper badgeProps={badgeProps}>
          {renderAvatarBaseWithBadge()}
        </BadgeWrapper>
      ) : (
        renderAvatarBaseWithBadge()
      )}
    </>
  );
};

export default AvatarBaseWithBadge;

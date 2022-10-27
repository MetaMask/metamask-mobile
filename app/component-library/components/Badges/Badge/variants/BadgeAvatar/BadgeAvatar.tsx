/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import Avatar from '../../../../Avatars/Avatar';
import { useStyles } from '../../../../../hooks';
import BadgeBase from '../../foundation/BadgeBase';
import { BADGE_AVATAR_TEST_ID } from '../../Badge.constants';

// Internal dependencies
import { BadgeAvatarPosition, BadgeAvatarProps } from './BadgeAvatar.types';
import styleSheet from './BadgeAvatar.styles';

const BadgeAvatar = ({
  position = BadgeAvatarPosition.TopRight,
  avatarProps,
}: BadgeAvatarProps) => {
  const { styles } = useStyles(styleSheet, { position });

  return (
    <BadgeBase style={styles.base} testID={BADGE_AVATAR_TEST_ID}>
      <Avatar {...avatarProps} />
    </BadgeBase>
  );
};

export default BadgeAvatar;

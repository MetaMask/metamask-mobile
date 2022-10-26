/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import Avatar, { AvatarSize, AvatarVariants } from '../../../../Avatars/Avatar';
import { useStyles } from '../../../../../hooks';
import BadgeBase from '../../foundation/BadgeBase';
import { BADGE_NETWORK_TEST_ID } from '../../Badge.constants';

// Internal dependencies
import { BadgeNetworkPosition, BadgeNetworkProps } from './BadgeNetwork.types';
import styleSheet from './BadgeNetwork.styles';

const BadgeNetwork = ({
  position = BadgeNetworkPosition.TopRight,
  imageSource,
}: BadgeNetworkProps) => {
  const { styles } = useStyles(styleSheet, { position });

  return (
    <BadgeBase style={styles.base} testID={BADGE_NETWORK_TEST_ID}>
      <Avatar
        variant={AvatarVariants.Image}
        imageSource={imageSource}
        size={AvatarSize.Xs}
      />
    </BadgeBase>
  );
};

export default BadgeNetwork;

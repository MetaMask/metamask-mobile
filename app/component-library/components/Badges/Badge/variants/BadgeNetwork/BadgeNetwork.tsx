/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useComponentSize, useStyles } from '../../../../../hooks';
import BadgeBase from '../../foundation/BadgeBase';
import Avatar, { AvatarVariants } from '../../../../Avatars/Avatar';

// Internal dependencies
import { BadgeNetworkProps } from './BadgeNetwork.types';
import styleSheet from './BadgeNetwork.styles';
import {
  BADGE_NETWORK_TEST_ID,
  DEFAULT_BADGENETWORK_NETWORKICON_SIZE,
} from './BadgeNetwork.constants';

const BadgeNetwork = ({ style, name, imageSource }: BadgeNetworkProps) => {
  const { size: containerSize, onLayout: onLayoutContainerSize } =
    useComponentSize();
  const { styles } = useStyles(styleSheet, { style, containerSize });
  return (
    <BadgeBase
      style={styles.base}
      testID={BADGE_NETWORK_TEST_ID}
      onLayout={onLayoutContainerSize}
    >
      <Avatar
        variant={AvatarVariants.Network}
        size={DEFAULT_BADGENETWORK_NETWORKICON_SIZE}
        name={name}
        imageSource={imageSource}
        style={styles.networkIcon}
      />
    </BadgeBase>
  );
};

export default BadgeNetwork;

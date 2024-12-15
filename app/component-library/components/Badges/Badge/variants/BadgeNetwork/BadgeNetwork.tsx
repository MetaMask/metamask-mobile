/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useComponentSize, useStyles } from '../../../../../hooks';
import BadgeBase from '../../foundation/BadgeBase';
import Avatar, { AvatarVariant } from '../../../../Avatars/Avatar';

// Internal dependencies
import { BadgeNetworkProps } from './BadgeNetwork.types';
import styleSheet from './BadgeNetwork.styles';
import {
  BADGENETWORK_TEST_ID,
  DEFAULT_BADGENETWORK_NETWORKICON_SIZE,
} from './BadgeNetwork.constants';

const BadgeNetwork = ({
  style,
  name,
  imageSource,
  size = DEFAULT_BADGENETWORK_NETWORKICON_SIZE,
  isScaled = true,
}: BadgeNetworkProps) => {
  const { size: containerSize, onLayout: onLayoutContainerSize } =
    useComponentSize();
  const { styles } = useStyles(styleSheet, {
    style,
    containerSize,
    size,
    isScaled,
  });
  return (
    <BadgeBase
      style={styles.base}
      testID={BADGENETWORK_TEST_ID}
      onLayout={onLayoutContainerSize}
    >
      <Avatar
        variant={AvatarVariant.Network}
        size={size}
        name={name}
        imageSource={imageSource}
        style={styles.networkIcon}
      />
    </BadgeBase>
  );
};

export default BadgeNetwork;

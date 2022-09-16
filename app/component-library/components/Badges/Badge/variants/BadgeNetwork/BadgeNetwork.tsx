/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import AvatarNetwork from '../../../../Avatars/AvatarNetwork';
import { AvatarBaseSize } from '../../../../Avatars/AvatarBase';
import { useStyles } from '../../../../../hooks';
import BadgeBase from '../../foundation/BadgeBase';
import { BADGE_NETWORK_TEST_ID } from '../../Badge.constants';

// Internal dependencies
import { BadgeNetworkPosition, BadgeNetworkProps } from './BadgeNetwork.types';
import styleSheet from './BadgeNetwork.styles';

const BadgeNetwork = ({
  position = BadgeNetworkPosition.TopRight,
  name,
  imageSource,
}: BadgeNetworkProps) => {
  const { styles } = useStyles(styleSheet, { position });

  return (
    <BadgeBase style={styles.base} testID={BADGE_NETWORK_TEST_ID}>
      <AvatarNetwork
        name={name}
        imageSource={imageSource}
        size={AvatarBaseSize.Xs}
      />
    </BadgeBase>
  );
};

export default BadgeNetwork;

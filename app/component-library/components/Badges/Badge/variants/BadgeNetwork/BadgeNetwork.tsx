/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import AvatarNetwork from '../../Avatars/AvatarNetwork';
import { AvatarBaseSize } from '../../Avatars/AvatarBase';
import { useStyles } from '../../../hooks';

// Internal dependencies
import { BadgeNetworkPosition, BadgeNetworkProps } from './BadgeNetwork.types';
import styleSheet from './BadgeNetwork.styles';
import { BADGE_NETWORK_TEST_ID } from './BadgeNetwork.constants';

const BadgeNetwork = ({
  position = BadgeNetworkPosition.TopRight,
  name,
  imageSource,
  ...props
}: BadgeNetworkProps) => {
  const { styles } = useStyles(styleSheet, { position });

  return (
    <View key={BADGE_NETWORK_TEST_ID} style={styles.badgeContainer} {...props}>
      <AvatarNetwork
        name={name}
        imageSource={imageSource}
        size={AvatarBaseSize.Xs}
      />
    </View>
  );
};

export default BadgeNetwork;

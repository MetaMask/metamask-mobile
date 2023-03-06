/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';
import { Image, ImageSourcePropType } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import BadgeBase from '../../foundation/BadgeBase';
import { BADGE_NETWORK_TEST_ID } from '../../Badge.constants';

// Internal dependencies
import { BadgeNetworkProps } from './BadgeNetwork.types';
import styleSheet from './BadgeNetwork.styles';

const BadgeNetwork = ({ name, imageSource }: BadgeNetworkProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <BadgeBase style={styles.base} testID={BADGE_NETWORK_TEST_ID}>
      <Image
        source={imageSource as ImageSourcePropType}
        style={styles.image}
        resizeMode={'contain'}
      />
    </BadgeBase>
  );
};

export default BadgeNetwork;

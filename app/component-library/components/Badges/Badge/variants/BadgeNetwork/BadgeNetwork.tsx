/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import BadgeBase from '../../foundation/BadgeBase';
import Network from '../../../../Networks/Network';

// Internal dependencies
import { BadgeNetworkProps } from './BadgeNetwork.types';
import styleSheet from './BadgeNetwork.styles';
import { BADGE_NETWORK_TEST_ID } from './BadgeNetwork.constants';

const BadgeNetwork = ({ networkProps, style }: BadgeNetworkProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <BadgeBase style={styles.base} testID={BADGE_NETWORK_TEST_ID}>
      <Network {...networkProps} />
    </BadgeBase>
  );
};

export default BadgeNetwork;

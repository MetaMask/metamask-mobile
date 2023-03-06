/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import BadgeBase from '../../foundation/BadgeBase';

// Internal dependencies
import { BadgeStatusProps, BadgeStatusState } from './BadgeStatus.types';
import styleSheet from './BadgeStatus.styles';

const BadgeStatus = ({
  state = BadgeStatusState.Disconnected,
  borderColor,
}: BadgeStatusProps) => {
  const { styles } = useStyles(styleSheet, { state, borderColor });

  return (
    <BadgeBase style={styles.base}>
      <View />
    </BadgeBase>
  );
};

export default BadgeStatus;

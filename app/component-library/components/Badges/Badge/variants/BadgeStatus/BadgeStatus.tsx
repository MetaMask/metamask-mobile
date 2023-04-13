/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import BadgeBase from '../../foundation/BadgeBase';

// Internal dependencies
import { BadgeStatusProps } from './BadgeStatus.types';
import styleSheet from './BadgeStatus.styles';
import {
  BADGE_STATUS_TEST_ID,
  DEFAULT_BADGESTATUS_STATE,
} from './BadgeStatus.constants';

const BadgeStatus = ({
  style,
  state = DEFAULT_BADGESTATUS_STATE,
  borderColor,
}: BadgeStatusProps) => {
  const { styles } = useStyles(styleSheet, { style, state, borderColor });

  return (
    <BadgeBase style={styles.base} testID={BADGE_STATUS_TEST_ID}>
      <View />
    </BadgeBase>
  );
};

export default BadgeStatus;

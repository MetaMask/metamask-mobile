/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';

import { useComponentSize, useStyles } from '../../../../../hooks';
import BadgeBase from '../../foundation/BadgeBase';
import { BadgeNotificationsProps } from './BadgeNotifications.types';
import styleSheet from './BadgeNotifications.styles';
import { BADGE_NOTIFICATIONS_TEST_ID } from './BadgeNotifications.constants';
import Icon, { IconSize, IconColor } from '../../../../Icons/Icon';

const BadgeNotifications = ({ style, iconName }: BadgeNotificationsProps) => {
  const { size: containerSize, onLayout: onLayoutContainerSize } =
    useComponentSize();
  const { styles } = useStyles(styleSheet, { style, containerSize });
  return (
    <BadgeBase
      style={styles.base}
      testID={BADGE_NOTIFICATIONS_TEST_ID}
      onLayout={onLayoutContainerSize}
    >
      {iconName && (
        <Icon name={iconName} size={IconSize.Xss} color={IconColor.Inverse} />
      )}
    </BadgeBase>
  );
};

export default BadgeNotifications;

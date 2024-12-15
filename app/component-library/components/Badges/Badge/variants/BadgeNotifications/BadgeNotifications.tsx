// Third library dependencies.
import React from 'react';

// External dependencies.
import BadgeBase from '../../foundation/BadgeBase';
import { useComponentSize, useStyles } from '../../../../../hooks';
import Icon, { IconSize, IconColor } from '../../../../Icons/Icon';

// Internal dependencies
import { BadgeNotificationsProps } from './BadgeNotifications.types';
import styleSheet from './BadgeNotifications.styles';

const BadgeNotifications = ({
  style,
  iconName,
  testID,
}: BadgeNotificationsProps) => {
  const { size: containerSize, onLayout: onLayoutContainerSize } =
    useComponentSize();
  const { styles } = useStyles(styleSheet, { style, containerSize });
  return (
    <BadgeBase
      style={styles.base}
      testID={testID}
      onLayout={onLayoutContainerSize}
    >
      <Icon name={iconName} size={IconSize.Xss} color={IconColor.Inverse} />
    </BadgeBase>
  );
};

export default BadgeNotifications;

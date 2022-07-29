/* eslint-disable react/prop-types */
import React from 'react';
import { View, ViewStyle } from 'react-native';

import { useStyles } from '../../hooks';

import { AvatarWithBadgeProps } from './AvatarWithBadge.types';
import stylesheet from './AvatarWithBadge.styles';
import { BaseAvatarSize } from '../BaseAvatar';

const Badge = ({
  style,
  children,
}: {
  style: ViewStyle;
  children: JSX.Element;
}) => <View style={style}>{children}</View>;

const AvatarWithBadge: React.FC<AvatarWithBadgeProps> = ({
  showBadge,
  badgePosition,
  badge = null,
  size,
  children,
}) => {
  const { styles } = useStyles(stylesheet, { badgePosition, showBadge, size });

  return (
    <View style={styles.base}>
      {React.cloneElement(children, { size: BaseAvatarSize.Md })}
      {showBadge && <Badge style={styles.badge}>{badge}</Badge>}
    </View>
  );
};

export default AvatarWithBadge;

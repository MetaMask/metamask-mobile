/* eslint-disable react/prop-types */
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useStyles } from '../../hooks/useStyles';
import { BaseAvatarProps } from './BaseAvatar.types';
import styleSheet from './BaseAvatar.styles';
import { afterEach } from 'detox';
import NetworkAvatar from '../NetworkAvatar';

const Badge = ({
  style,
  children,
}: {
  style: ViewStyle;
  children: JSX.Element;
}) => <View style={style}>{children}</View>;

const BaseAvatar: React.FC<BaseAvatarProps> = ({
  size,
  style,
  children,
  showBadge,
  badgeComponent,
  badgePosition,
}) => {
  const { styles } = useStyles(styleSheet, {
    size,
    style,
  });

  const badge = () => <NetworkAvatar />;

  return (
    <View style={styles.container}>
      {children}
      {showBadge && <Badge style={styles.badge}>{badge}</Badge>}
    </View>
  );
};

export default BaseAvatar;

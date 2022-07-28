/* eslint-disable react/prop-types */
import React from 'react';
import { Text, View } from 'react-native';

import { useStyles } from '../../hooks';

import { AvatarWithBadgeProps } from './AvatarWithBadge.types';
import stylesheet from './AvatarWithBadge.styles';

const AccountAvatar = ({
  showBadge,
  badgePosition,
  style,
  children,
}: AvatarWithBadgeProps) => {
  const styles = useStyles(stylesheet, { badgePosition, showBadge });

  console.log(styles);

  return (
    <View style={styles.container}>
      <View style={styles.badge} />
        {children}
    </View>
  );
};

export default AccountAvatar;

export { AccountAvatar };

/* eslint-disable react/prop-types */
import { useStyles } from '../../hooks';
import React from 'react';
import { View } from 'react-native';
import AccountAvatar from '../AccountAvatar';
import NetworkAvatar from '../NetworkAvatar';
import stylesheet from './AccountAvatarOnNetwork.styles';
import { AccountAvatarOnNetworkProps } from './AccountAvatarOnNetwork.types';
import { BaseAvatarSize } from '../BaseAvatar';
import { AvatarBadgePosition } from '../AvatarWithBadge/AvatarWithBadge.types';

const AccountAvatarOnNetwork = ({
  type,
  accountAddress,
  networkName,
  networkImageUrl,
  badgePosition = AvatarBadgePosition.TopRight,
  size,
}: AccountAvatarOnNetworkProps) => {
  const { styles } = useStyles(stylesheet, { badgePosition });

  return (
    <View style={styles.base}>
      <AccountAvatar type={type} size={size} accountAddress={accountAddress} />
      <NetworkAvatar
        style={styles.badge}
        size={BaseAvatarSize.Xs}
        networkName={networkName}
        networkImageUrl={networkImageUrl}
      />
    </View>
  );
};

export default AccountAvatarOnNetwork;

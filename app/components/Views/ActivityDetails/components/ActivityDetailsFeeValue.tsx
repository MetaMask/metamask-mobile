import React from 'react';
import { Image, StyleSheet } from 'react-native';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  ActivityFee,
  TokenAmount,
} from '../../../../util/activity-adapters';
import { getNetworkImageSource } from '../../../../util/networks';
import { getTokenImageSource } from '../../../UI/ActivityListItemRow/tokenIcon';

const FEE_NETWORK_BADGE_SIZE = 12;
const FEE_NETWORK_BADGE_RADIUS = 4;

const styles = StyleSheet.create({
  networkBadge: {
    width: FEE_NETWORK_BADGE_SIZE,
    height: FEE_NETWORK_BADGE_SIZE,
    borderRadius: FEE_NETWORK_BADGE_RADIUS,
  },
  networkBadgeImage: {
    width: '100%',
    height: '100%',
  },
  tokenAvatarWrapper: {
    transform: [{ translateY: 4 }],
  },
});

export function ActivityDetailsFeeValue({
  fee,
  value,
  chainId,
}: {
  fee: ActivityFee;
  value?: string;
  chainId: string;
}) {
  if (!value) {
    return null;
  }

  const token: TokenAmount = {
    amount: fee.amount,
    decimals: fee.decimals,
    direction: 'out',
    symbol: fee.symbol,
    assetId: fee.assetId,
  };
  const tokenImageSource = getTokenImageSource(token);
  const networkImageSource = getNetworkImageSource({ chainId });

  return (
    <Box twClassName="flex-row items-center justify-end gap-2 shrink">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName="shrink"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
      {fee.symbol ? (
        <Box twClassName="flex-row items-center gap-1 shrink">
          <BadgeWrapper
            position={BadgeWrapperPosition.BottomRight}
            style={styles.tokenAvatarWrapper}
            badge={
              networkImageSource ? (
                <Box
                  twClassName="overflow-hidden border border-background-default bg-default"
                  style={styles.networkBadge}
                  testID="fee-network-badge"
                >
                  <Image
                    source={networkImageSource}
                    style={styles.networkBadgeImage}
                  />
                </Box>
              ) : null
            }
          >
            <AvatarToken
              name={fee.symbol}
              src={tokenImageSource}
              size={AvatarTokenSize.Xs}
              testID="fee-token-avatar"
            />
          </BadgeWrapper>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            twClassName="ml-1 shrink"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {fee.symbol}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

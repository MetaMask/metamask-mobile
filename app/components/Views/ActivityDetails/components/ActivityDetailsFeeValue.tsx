import React from 'react';
import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';
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
import {
  GAS_FEE_SPONSORED,
  type ActivityFee,
  type TokenAmount,
} from '../../../../util/activity-adapters';
import { getNetworkImageSource } from '../../../../util/networks';
import { getTokenImageSource } from '../../../UI/ActivityListItemRow/tokenIcon';
import TagColored, {
  TagColor,
} from '../../../../component-library/components-temp/TagColored';

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

/**
 * A fee amount followed by its token and network badge (`$1.23 (◆)ETH`). Shows
 * the amount alone when `symbol` is unknown.
 */
export function ActivityFeeTokenValue({
  value,
  symbol,
  tokenImageSource,
  networkImageSource,
}: {
  value: string;
  symbol?: string;
  tokenImageSource?: ReturnType<typeof getTokenImageSource>;
  networkImageSource?: ImageSourcePropType;
}) {
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
      {symbol ? (
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
              name={symbol}
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
            {symbol}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

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

  if (fee.type === GAS_FEE_SPONSORED) {
    return (
      <TagColored
        color={TagColor.Success}
        labelProps={{ testID: 'paid-by-metamask' }}
      >
        {value}
      </TagColored>
    );
  }

  const token: TokenAmount = {
    amount: fee.amount,
    decimals: fee.decimals,
    direction: 'out',
    symbol: fee.symbol,
    assetId: fee.assetId,
  };

  return (
    <ActivityFeeTokenValue
      value={value}
      symbol={fee.symbol}
      tokenImageSource={getTokenImageSource(token)}
      networkImageSource={getNetworkImageSource({ chainId })}
    />
  );
}

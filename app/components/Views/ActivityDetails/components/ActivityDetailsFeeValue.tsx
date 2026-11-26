import React from 'react';
import type { ImageSourcePropType } from 'react-native';
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
import { Image } from '../../../UI/primitives/Image';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

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
    <Box className="shrink flex-row items-center justify-end gap-2">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        className="shrink"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
      {symbol ? (
        <Box className="shrink flex-row items-center gap-1">
          <BadgeWrapper
            position={BadgeWrapperPosition.BottomRight}
            twClassName="translate-y-1"
            badge={
              networkImageSource ? (
                <Box
                  className="size-3 overflow-hidden rounded border border-background-default bg-default"
                  testID="fee-network-badge"
                >
                  <Image source={networkImageSource} className="size-full" />
                </Box>
              ) : null
            }
          >
            <AvatarToken
              name={symbol}
              src={tokenImageSource}
              size={AvatarTokenSize.Xs}
              testID={ActivityDetailsSelectorsIDs.FEE_TOKEN_AVATAR}
            />
          </BadgeWrapper>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            className="ml-1 shrink"
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

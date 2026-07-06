import React from 'react';
import {
  AvatarTokenSize,
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  ActivityFee,
  TokenAmount,
} from '../../../../util/activity-adapters';
import { ActivityDetailsAvatar } from './ActivityDetailsAvatar';

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

  return (
    <Box twClassName="flex-row items-center justify-end gap-2 shrink">
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
        {value}
      </Text>
      {fee.symbol ? (
        <>
          <ActivityDetailsAvatar
            tokens={[token]}
            size={AvatarTokenSize.Sm}
            chainId={chainId}
            showNetworkBadge
          />
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {fee.symbol}
          </Text>
        </>
      ) : null}
    </Box>
  );
}

import React, { type RefObject } from 'react';
import { View } from 'react-native';
import {
  AvatarTokenSize,
  Box,
  TextVariant,
} from '@metamask/design-system-react-native';
import { UsdcIcon } from '../UsdcAmount';
import { formatUsdcAmount } from '../../providers/pack-partner/utils/format';
import ReplitAnimatedAmount from './ReplitAnimatedAmount';

const formatBalance = (amount: number) =>
  formatUsdcAmount(BigInt(Math.round(amount * 1_000_000)));

/** The receipt flow's balance capsule appears only after an actual confirmed buyback. */
export default function ReplitSaleWallet({
  value,
  from,
  targetRef,
  onLayout,
  isActive = true,
}: {
  value: bigint;
  from?: number;
  targetRef: RefObject<View | null>;
  onLayout: () => void;
  isActive?: boolean;
}) {
  return (
    <Box
      twClassName="flex-row items-center rounded-full bg-muted px-3 py-2 gap-2"
      testID="collectibles-sale-wallet"
    >
      <UsdcIcon size={AvatarTokenSize.Xs} />
      <View ref={targetRef} collapsable={false} onLayout={onLayout}>
        <ReplitAnimatedAmount
          value={Number(value) / 1_000_000}
          from={from ?? Number(value) / 1_000_000}
          delayMs={1050}
          durationMs={600}
          precision={100}
          variant={TextVariant.BodySm}
          formatValue={formatBalance}
          isActive={isActive}
        />
      </View>
    </Box>
  );
}

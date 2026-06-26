import React from 'react';
import {
  AvatarTokenSize,
  Box,
  TextColor,
  TextVariant,
  Text,
} from '@metamask/design-system-react-native';
import type { FiatOrder } from '../../../../../reducers/fiatOrders/types';
import { ActivityDetailsAvatar } from '../../../../Views/ActivityDetails/components/ActivityDetailsAvatar';
import {
  getRampActivityExplorerChainId,
  getRampActivityHeroAmount,
  getRampActivityHeroToken,
  isRampSellOrder,
} from './RampActivityDetails.utils';

export function RampActivityDetailsHero({ order }: { order: FiatOrder }) {
  const token = getRampActivityHeroToken(order);

  return (
    <Box twClassName="flex-row items-center gap-3">
      <ActivityDetailsAvatar
        tokens={[token]}
        chainId={getRampActivityExplorerChainId(order.network)}
        size={AvatarTokenSize.Xl}
        showNetworkBadge
      />
      <Text
        variant={TextVariant.DisplayMd}
        twClassName="shrink"
        color={
          isRampSellOrder(order)
            ? TextColor.TextDefault
            : TextColor.SuccessDefault
        }
      >
        {getRampActivityHeroAmount(order)}
      </Text>
    </Box>
  );
}

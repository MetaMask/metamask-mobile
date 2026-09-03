import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {TokenAvatar} from '../TokenAvatar';
import { TokenAmountValueSelectorsIDs } from './testIds';
import type { TokenAmountValueProps } from './types';

export const TokenAmountValue = ({
  amount,
  token,
  withNetworkBadge,
}: TokenAmountValueProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={1}
    twClassName="shrink"
    testID={TokenAmountValueSelectorsIDs.CONTAINER}
  >
    {token ? (
      <TokenAvatar token={token} withNetworkBadge={withNetworkBadge} />
    ) : null}
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextDefault}
      twClassName="text-right"
      testID={TokenAmountValueSelectorsIDs.AMOUNT}
    >
      {amount}
    </Text>
  </Box>
);


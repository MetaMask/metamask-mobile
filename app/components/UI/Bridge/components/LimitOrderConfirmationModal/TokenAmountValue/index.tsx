import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { TokenAvatar } from '../TokenAvatar';
import { TokenAmountValueSelectorsIDs } from './testIds';
import type { TokenAmountValueProps } from './types';

export const TokenAmountValue = ({
  amount,
  token,
  withNetworkBadge,
  error,
  showTokenSymbol,
}: TokenAmountValueProps) => {
  const amountColor = error ? TextColor.ErrorDefault : TextColor.TextDefault;
  const avatar = token ? (
    <TokenAvatar token={token} withNetworkBadge={withNetworkBadge} />
  ) : null;
  const amountText = (
    <Text
      variant={TextVariant.BodyMd}
      color={amountColor}
      twClassName="text-right"
      testID={TokenAmountValueSelectorsIDs.AMOUNT}
    >
      {amount}
    </Text>
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={1}
      twClassName="shrink"
      testID={TokenAmountValueSelectorsIDs.CONTAINER}
    >
      {showTokenSymbol ? (
        <>
          {amountText}
          {avatar}
          {token ? (
            <Text
              variant={TextVariant.BodyMd}
              color={amountColor}
              testID={TokenAmountValueSelectorsIDs.SYMBOL}
            >
              {token.symbol}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          {avatar}
          {amountText}
        </>
      )}
    </Box>
  );
};

import React from 'react';
import { Hex } from '@metamask/utils';
import Text from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import { TokenIcon, TokenIconVariant } from '../../token-icon';

interface TransactionDetailsFeeCellProps {
  testID: string;
  value: string;
  chainId: Hex;
  address: Hex;
}

export function TransactionDetailsFeeCell({
  testID,
  value,
  chainId,
  address,
}: TransactionDetailsFeeCellProps) {
  return (
    <Box
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      gap={4}
    >
      <Text testID={testID}>{value}</Text>
      <TokenIcon
        chainId={chainId}
        address={address}
        variant={TokenIconVariant.Row}
      />
    </Box>
  );
}

import React from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import { TokenIcon, TokenIconVariant } from '../../token-icon';

export function TransactionDetailsPayWithRow() {
  const chainId = '0x1';
  const USDC = '0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

  return (
    <TransactionDetailsRow label={'Paid with'}>
      <Box
        flexDirection={FlexDirection.Row}
        gap={6}
        alignItems={AlignItems.center}
      >
        <TokenIcon
          chainId={chainId}
          address={USDC}
          variant={TokenIconVariant.Row}
        />
        <Text>USDC</Text>
      </Box>
    </TransactionDetailsRow>
  );
}

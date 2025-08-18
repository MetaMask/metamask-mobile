import React from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { FlexDirection } from '../../../../../UI/Box/box.types';

export function TransactionDetailsPayWithRow() {
  return (
    <TransactionDetailsRow label={'Paid with'}>
      <Box flexDirection={FlexDirection.Row} gap={6}>
        <Text>USDC</Text>
      </Box>
    </TransactionDetailsRow>
  );
}

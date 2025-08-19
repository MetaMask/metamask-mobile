import React, { useMemo } from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import { TokenIcon, TokenIconVariant } from '../../token-icon';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { useTokensWithBalance } from '../../../../../UI/Bridge/hooks/useTokensWithBalance';

export function TransactionDetailsPayWithRow() {
  const { transactionMeta } = useTransactionDetails();
  const { metamaskPay } = transactionMeta;
  const { chainId, tokenAddress } = metamaskPay || {};
  const chainIds = useMemo(() => (chainId ? [chainId] : []), [chainId]);
  const tokens = useTokensWithBalance({ chainIds });

  const token = tokens.find(
    (t) => t.address.toLowerCase() === tokenAddress?.toLowerCase(),
  );

  if (!chainId || !tokenAddress || !token) {
    return null;
  }

  return (
    <TransactionDetailsRow label={'Paid with'}>
      <Box
        flexDirection={FlexDirection.Row}
        gap={6}
        alignItems={AlignItems.center}
      >
        <TokenIcon
          chainId={chainId}
          address={tokenAddress}
          variant={TokenIconVariant.Row}
        />
        <Text>{token.symbol}</Text>
      </Box>
    </TransactionDetailsRow>
  );
}

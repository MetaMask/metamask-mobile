import React from 'react';
import { TransactionDetailsRow } from '../transaction-details-row/transaction-details-row';
import Text from '../../../../../../component-library/components/Texts/Text';
import { Box } from '../../../../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../../../../UI/Box/box.types';
import { TokenIcon, TokenIconVariant } from '../../token-icon';
import { useTransactionDetails } from '../../../hooks/activity/useTransactionDetails';
import { strings } from '../../../../../../../locales/i18n';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { TransactionDetailsSelectorIDs } from '../TransactionDetailsModal.testIds';

export function TransactionDetailsPaidWithRow() {
  const { transactionMeta } = useTransactionDetails();
  const { metamaskPay } = transactionMeta;
  const { chainId, tokenAddress } = metamaskPay || {};
  const token = useTokenWithBalance(tokenAddress ?? '0x0', chainId ?? '0x0');

  if (!chainId || !tokenAddress || !token) {
    return null;
  }

  return (
    <TransactionDetailsRow
      label={strings('transaction_details.label.paid_with')}
    >
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
        <Text testID={TransactionDetailsSelectorIDs.PAID_WITH_SYMBOL}>
          {token.symbol}
        </Text>
      </Box>
    </TransactionDetailsRow>
  );
}

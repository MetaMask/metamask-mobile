import React from 'react';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { TransactionSummaryLine } from './transaction-summary-line';

export function ApprovalSummaryLine({
  transactionMeta,
}: {
  transactionMeta: TransactionMeta;
}) {
  const tokenAddress = transactionMeta.txParams?.to as Hex | undefined;

  const token = useTokenWithBalance(
    (tokenAddress ?? '0x0') as Hex,
    transactionMeta.chainId,
  );

  const title = token?.symbol
    ? strings('transaction_details.summary_title.bridge_approval', {
        approveSymbol: token.symbol,
      })
    : strings('transaction_details.summary_title.bridge_approval_loading');

  return (
    <TransactionSummaryLine title={title} transactionMeta={transactionMeta} />
  );
}

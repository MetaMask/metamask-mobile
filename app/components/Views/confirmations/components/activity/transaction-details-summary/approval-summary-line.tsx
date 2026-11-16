import React from 'react';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { parseApprovalTransactionData } from '../../../utils/approvals';
import { getTokenDisplaySymbol } from '../../../../../UI/Earn/constants/musd';
import { TransactionSummaryLine } from './transaction-summary-line';

export function ApprovalSummaryLine({
  transactionMeta,
}: {
  transactionMeta: TransactionMeta;
}) {
  const { data, to } = transactionMeta.txParams ?? {};
  // Permit2 approvals are sent to the Permit2 contract, the token is in the data
  const tokenAddress = (parseApprovalTransactionData(data as Hex)
    ?.tokenAddress ?? to) as Hex | undefined;

  const token = useTokenWithBalance(
    (tokenAddress ?? '0x0') as Hex,
    transactionMeta.chainId,
  );

  const approveSymbol = getTokenDisplaySymbol(tokenAddress, token?.symbol);

  const title = approveSymbol
    ? strings('transaction_details.summary_title.bridge_approval', {
        approveSymbol,
      })
    : strings('transaction_details.summary_title.bridge_approval_loading');

  return (
    <TransactionSummaryLine title={title} transactionMeta={transactionMeta} />
  );
}

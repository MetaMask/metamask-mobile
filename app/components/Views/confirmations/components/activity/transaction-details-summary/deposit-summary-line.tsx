import React from 'react';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import { hasTransactionType } from '../../../utils/transaction';
import { useNetworkName } from '../../../hooks/useNetworkName';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { TransactionSummaryLine } from './transaction-summary-line';

export function DepositSummaryLine({
  transactionMeta,
  parentTransaction,
}: {
  transactionMeta: TransactionMeta;
  parentTransaction: TransactionMeta;
}) {
  const tokenAddress = parentTransaction.metamaskPay?.tokenAddress;
  const tokenChainId = parentTransaction.metamaskPay?.chainId;

  const sourceToken = useTokenWithBalance(
    tokenAddress ?? '0x0',
    tokenChainId ?? transactionMeta.chainId,
  );

  const sourceNetworkName = useNetworkName(transactionMeta.chainId);
  const isMusdConversion = hasTransactionType(parentTransaction, [
    TransactionType.musdConversion,
  ]);

  const title =
    sourceToken?.symbol && sourceNetworkName
      ? strings(
          isMusdConversion
            ? 'transaction_details.summary_title.musd_convert_send'
            : 'transaction_details.summary_title.bridge_send',
          {
            sourceSymbol: sourceToken.symbol,
            sourceChain: sourceNetworkName,
          },
        )
      : strings('transaction_details.summary_title.bridge_send_loading');

  return (
    <TransactionSummaryLine title={title} transactionMeta={transactionMeta} />
  );
}

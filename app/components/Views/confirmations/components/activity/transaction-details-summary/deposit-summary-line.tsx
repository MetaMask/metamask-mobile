import React from 'react';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { strings } from '../../../../../../../locales/i18n';
import { hasTransactionType } from '../../../utils/transaction';
import { useNetworkName } from '../../../hooks/useNetworkName';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { getTokenDisplaySymbol } from '../../../../../UI/Earn/constants/musd';
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

  const sourceSymbol = getTokenDisplaySymbol(tokenAddress, sourceToken?.symbol);

  const title =
    sourceSymbol && sourceNetworkName
      ? strings(
          isMusdConversion
            ? 'transaction_details.summary_title.musd_convert_send'
            : 'transaction_details.summary_title.bridge_send',
          {
            sourceSymbol,
            sourceChain: sourceNetworkName,
          },
        )
      : strings('transaction_details.summary_title.bridge_send_loading');

  return (
    <TransactionSummaryLine title={title} transactionMeta={transactionMeta} />
  );
}

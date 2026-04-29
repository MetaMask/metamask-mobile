import React from 'react';
import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import { useNetworkName } from '../../../hooks/useNetworkName';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { TransactionSummaryLine } from './transaction-summary-line';

export function SourceHashSummaryLine({
  parentTransaction,
  sourceHash,
}: {
  parentTransaction: TransactionMeta;
  sourceHash: Hex;
}) {
  const tokenAddress = parentTransaction.metamaskPay?.tokenAddress;
  const tokenChainId = parentTransaction.metamaskPay?.chainId;

  const sourceToken = useTokenWithBalance(
    tokenAddress ?? '0x0',
    tokenChainId ?? '0x0',
  );

  const sourceNetworkName = useNetworkName(tokenChainId);
  const chainId = tokenChainId ?? parentTransaction.chainId;

  const title =
    sourceToken?.symbol && sourceNetworkName
      ? strings('transaction_details.summary_title.bridge_send', {
          sourceSymbol: sourceToken.symbol,
          sourceChain: sourceNetworkName,
        })
      : strings('transaction_details.summary_title.bridge_send_loading');

  return (
    <TransactionSummaryLine
      title={title}
      transactionMeta={parentTransaction}
      chainId={chainId}
      txHash={sourceHash}
    />
  );
}

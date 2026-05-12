import React from 'react';
import { TransactionMeta, TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import { useNetworkName } from '../../../hooks/useNetworkName';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';
import { TransactionSummaryLine } from './transaction-summary-line';
import { hasTransactionType } from '../../../utils/transaction';
import { POLYGON_PUSD } from '../../../constants/predict';

export function SourceHashSummaryLine({
  parentTransaction,
  sourceHash,
}: {
  parentTransaction: TransactionMeta;
  sourceHash: Hex;
}) {
  const { chainId: targetChainId, metamaskPay } = parentTransaction;
  const sourceTokenAddress = metamaskPay?.tokenAddress;
  const sourceTokenChainId = metamaskPay?.chainId;

  const sourceToken = useTokenWithBalance(
    sourceTokenAddress ?? '0x0',
    sourceTokenChainId ?? '0x0',
  );

  const sourceNetworkName = useNetworkName(sourceTokenChainId);
  const targetNetworkName = useNetworkName(targetChainId);

  const isPredictWithdraw = hasTransactionType(parentTransaction, [
    TransactionType.predictWithdraw,
  ]);

  const chainId = isPredictWithdraw ? targetChainId : sourceTokenChainId;

  let title = strings('transaction_details.summary_title.bridge_send_loading');

  if (sourceToken?.symbol && sourceNetworkName) {
    title = strings('transaction_details.summary_title.bridge_send', {
      sourceSymbol: sourceToken.symbol,
      sourceChain: sourceNetworkName,
    });

    if (isPredictWithdraw) {
      title = strings('transaction_details.summary_title.predict_withdraw', {
        sourceSymbol: POLYGON_PUSD.symbol,
        sourceChain: targetNetworkName,
      });
    }
  }

  return (
    <TransactionSummaryLine
      title={title}
      transactionMeta={parentTransaction}
      chainId={chainId}
      txHash={sourceHash}
    />
  );
}

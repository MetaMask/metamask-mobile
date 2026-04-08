import React from 'react';
import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import { hasTransactionType } from '../../../utils/transaction';
import { useNetworkName } from '../../../hooks/useNetworkName';
import { POLYGON_USDCE } from '../../../constants/predict';
import { TransactionSummaryLine } from './transaction-summary-line';

const HYPERLIQUID_EXPLORER_URL = 'https://app.hyperliquid.xyz/explorer/tx';
const HYPERLIQUID_EXPLORER_NAME = 'Hyperliquid';

export function ReceiveSummaryLine({
  transactionMeta,
}: {
  transactionMeta: TransactionMeta;
}) {
  const { chainId } = transactionMeta;
  const isPerpsDeposit = hasTransactionType(transactionMeta, [
    TransactionType.perpsDeposit,
  ]);

  const isPredictDeposit = hasTransactionType(transactionMeta, [
    TransactionType.predictDeposit,
  ]);

  const networkName = useNetworkName(chainId);

  let targetSymbol = 'mUSD';
  let targetNetworkName: string | undefined = networkName;
  let receiveChainId: Hex = chainId;

  if (isPerpsDeposit) {
    targetSymbol = 'USDC';
    targetNetworkName = 'Hyperliquid';
    receiveChainId = CHAIN_IDS.ARBITRUM;
  } else if (isPredictDeposit) {
    targetSymbol = POLYGON_USDCE.symbol;
  }

  const title =
    targetSymbol && targetNetworkName
      ? strings('transaction_details.summary_title.bridge_receive', {
          targetSymbol,
          targetChain: targetNetworkName,
        })
      : strings('transaction_details.summary_title.bridge_receive_loading');

  const explorerUrl =
    isPerpsDeposit && transactionMeta.hash
      ? `${HYPERLIQUID_EXPLORER_URL}/${transactionMeta.hash}`
      : undefined;

  const explorerName = explorerUrl ? HYPERLIQUID_EXPLORER_NAME : undefined;

  return (
    <TransactionSummaryLine
      title={title}
      transactionMeta={transactionMeta}
      chainId={receiveChainId}
      explorerUrl={explorerUrl}
      explorerName={explorerName}
    />
  );
}

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
import { POLYGON_PUSD } from '../../../constants/predict';
import { TransactionSummaryLine } from './transaction-summary-line';
import { useTokenWithBalance } from '../../../hooks/tokens/useTokenWithBalance';

const HYPERLIQUID_EXPLORER_URL = 'https://app.hyperliquid.xyz/explorer/tx';
const HYPERLIQUID_EXPLORER_NAME = 'Hyperliquid';

export function ReceiveSummaryLine({
  transactionMeta,
}: {
  transactionMeta: TransactionMeta;
}) {
  const { chainId: targetChainId, metamaskPay } = transactionMeta;
  const sourceChainId = metamaskPay?.chainId;
  const sourceTokenAddress = metamaskPay?.tokenAddress;

  const isPerpsDeposit = hasTransactionType(transactionMeta, [
    TransactionType.perpsDeposit,
  ]);

  const isPredictDeposit = hasTransactionType(transactionMeta, [
    TransactionType.predictDeposit,
  ]);

  const isPredictWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.predictWithdraw,
  ]);

  const targetNetworkName = useNetworkName(targetChainId);
  const sourceNetworkName = useNetworkName(sourceChainId ?? '0x0');

  const sourceToken = useTokenWithBalance(
    sourceTokenAddress ?? '0x0',
    sourceChainId ?? '0x0',
  );

  let targetSymbol = 'mUSD';
  let finalTargetNetworkName: string | undefined = targetNetworkName;
  let receiveChainId: Hex = targetChainId;

  if (isPerpsDeposit) {
    targetSymbol = 'USDC';
    finalTargetNetworkName = 'Hyperliquid';
    receiveChainId = CHAIN_IDS.ARBITRUM;
  } else if (isPredictDeposit) {
    targetSymbol = POLYGON_PUSD.symbol;
  } else if (isPredictWithdraw) {
    targetSymbol = sourceToken?.symbol ?? 'Unknown';
    finalTargetNetworkName = sourceNetworkName;
    receiveChainId = sourceChainId ?? '0x0';
  }

  const title =
    targetSymbol && finalTargetNetworkName
      ? strings('transaction_details.summary_title.bridge_receive', {
          targetSymbol,
          targetChain: finalTargetNetworkName,
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

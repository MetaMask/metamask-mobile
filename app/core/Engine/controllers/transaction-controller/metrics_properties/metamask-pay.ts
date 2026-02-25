import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { TransactionMetricsBuilder } from '../types';
import { JsonMap } from '../../../../Analytics/MetaMetrics.types';
import { orderBy } from 'lodash';
import { NATIVE_TOKEN_ADDRESS } from '../../../../../components/Views/confirmations/constants/tokens';
import { hasTransactionType } from '../../../../../components/Views/confirmations/utils/transaction';
import {
  TransactionPayBridgeQuote,
  TransactionPayQuote,
  TransactionPayStrategy,
} from '@metamask/transaction-pay-controller';
import { RootState } from '../../../../../reducers';
import { selectSingleTokenByAddressAndChainId } from '../../../../../selectors/tokensController';
import { Hex } from '@metamask/utils';

const FOUR_BYTE_SAFE_PROXY_CREATE = '0xa1884d2c';

const COPY_METRICS = [
  'mm_pay',
  'mm_pay_use_case',
  'mm_pay_transaction_step_total',
] as const;

const PAY_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.predictDeposit,
];

export const getMetaMaskPayProperties: TransactionMetricsBuilder = ({
  transactionMeta,
  allTransactions,
  getUIMetrics,
  getState,
}) => {
  const properties: JsonMap = {};
  const sensitiveProperties: JsonMap = {};
  const { batchId, id: transactionId, type } = transactionMeta;
  const executionLatency = getExecutionLatency(transactionMeta);

  if (executionLatency !== undefined) {
    properties.mm_pay_execution_latency = executionLatency;
  }

  const parentTransaction = allTransactions.find(
    (tx) =>
      tx.requiredTransactionIds?.includes(transactionId) ||
      (batchId && hasTransactionType(tx, PAY_TYPES) && tx.batchId === batchId),
  );

  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
    properties.polymarket_account_created = (
      transactionMeta?.nestedTransactions ?? []
    ).some((t) => t.data?.startsWith(FOUR_BYTE_SAFE_PROXY_CREATE));
  }

  if (hasTransactionType(transactionMeta, PAY_TYPES) || !parentTransaction) {
    addFallbackProperties(properties, transactionMeta, getState());

    return {
      properties,
      sensitiveProperties,
    };
  }

  const parentMetrics = getUIMetrics(parentTransaction.id);

  for (const key of COPY_METRICS) {
    if (parentMetrics?.properties?.[key] !== undefined) {
      properties[key] = parentMetrics.properties[key];
    }
  }

  const batchTransactionIds = parentTransaction.batchId
    ? orderBy(
        allTransactions.filter(
          (tx) => tx.batchId === parentTransaction.batchId,
        ),
        (t) => parseInt(t.txParams.nonce ?? '0x0', 16),
        'asc',
      ).map((t) => t.id)
    : undefined;

  const relatedTransactionIds =
    parentTransaction.requiredTransactionIds ?? batchTransactionIds ?? [];

  properties.mm_pay_transaction_step =
    relatedTransactionIds.indexOf(transactionId) + 1;

  if (
    [TransactionType.bridge, TransactionType.swap].includes(
      type as TransactionType,
    )
  ) {
    const quotes =
      getState().engine.backgroundState.TransactionPayController
        .transactionData[parentTransaction.id]?.quotes ?? [];

    const quoteTransactionIds = relatedTransactionIds.filter((id) =>
      allTransactions.some(
        (tx) =>
          tx.id === id &&
          [TransactionType.bridge, TransactionType.swap].includes(
            tx.type as TransactionType,
          ),
      ),
    );

    const quoteIndex = quoteTransactionIds.indexOf(transactionMeta.id);
    const quote = quotes[quoteIndex];

    const quoteImpactUsd = quote?.fees?.impact?.usd;
    const quoteImpactRatio = quote?.fees?.impactRatio;

    if (quoteImpactUsd !== undefined) {
      properties.mm_pay_quote_impact_usd = quoteImpactUsd;
    }

    if (quoteImpactRatio !== undefined) {
      properties.mm_pay_quote_impact_ratio = quoteImpactRatio;
    }

    if (quote?.strategy === TransactionPayStrategy.Bridge) {
      const bridgeQuote =
        quote as TransactionPayQuote<TransactionPayBridgeQuote>;

      const metrics = bridgeQuote.original.metrics;

      properties.mm_pay_quotes_attempts = metrics?.attempts;
      properties.mm_pay_quotes_buffer_size = metrics?.buffer;
      properties.mm_pay_quotes_latency = metrics?.latency;
      properties.mm_pay_bridge_provider = bridgeQuote.original.quote.bridgeId;
    }

    if (quote?.strategy === ('across' as TransactionPayStrategy)) {
      properties.mm_pay_strategy = 'across';

      const quoteLatency = quote.original?.metrics?.latency;

      if (quoteLatency !== undefined) {
        properties.mm_pay_quotes_latency = quoteLatency;
      }
    }

    if (quote && quote.request.targetTokenAddress !== NATIVE_TOKEN_ADDRESS) {
      properties.mm_pay_dust_usd = parentMetrics?.properties?.mm_pay_dust_usd;
    }
  }

  return {
    properties,
    sensitiveProperties,
  };
};

function addFallbackProperties(
  properties: JsonMap,
  transaction: TransactionMeta,
  state: RootState,
) {
  const { metamaskPay } = transaction;

  if (
    !metamaskPay?.chainId ||
    !metamaskPay?.tokenAddress ||
    properties.mm_pay
  ) {
    return;
  }

  const { chainId, tokenAddress } = metamaskPay;

  properties.mm_pay = true;
  properties.mm_pay_chain_selected = chainId;

  properties.mm_pay_token_selected = getTokenSymbol(
    state,
    chainId,
    tokenAddress,
  );
}

function getTokenSymbol(state: RootState, chainId: Hex, tokenAddress: Hex) {
  const token = selectSingleTokenByAddressAndChainId(
    state,
    tokenAddress,
    chainId,
  );

  return token?.symbol;
}

type MetaMaskPayMetadataWithLatency = TransactionMeta['metamaskPay'] & {
  executionLatencyMs?: number;
};

function getExecutionLatency(
  transactionMeta: TransactionMeta,
): number | undefined {
  const metadata = transactionMeta.metamaskPay as
    | MetaMaskPayMetadataWithLatency
    | undefined;
  return metadata?.executionLatencyMs;
}

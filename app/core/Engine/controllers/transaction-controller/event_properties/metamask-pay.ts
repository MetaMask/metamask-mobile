import { TransactionType } from '@metamask/transaction-controller';
import { TransactionMetricsBuilder } from '../types';
import { JsonMap } from '../../../../Analytics/MetaMetrics.types';
import { orderBy } from 'lodash';
import { NATIVE_TOKEN_ADDRESS } from '../../../../../components/Views/confirmations/constants/tokens';

const COPY_METRICS = [
  'mm_pay',
  'mm_pay_use_case',
  'mm_pay_transaction_step_total',
] as const;

export const getMetaMaskPayProperties: TransactionMetricsBuilder = ({
  transactionMeta,
  allTransactions,
  getUIMetrics,
  getState,
}) => {
  const properties: JsonMap = {};
  const sensitiveProperties: JsonMap = {};
  const { batchId, id: transactionId, type } = transactionMeta;

  const parentTransaction = allTransactions.find(
    (tx) =>
      tx.requiredTransactionIds?.includes(transactionId) ||
      (batchId &&
        tx.type === TransactionType.perpsDeposit &&
        tx.batchId === batchId),
  );

  if (type === TransactionType.perpsDeposit || !parentTransaction) {
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
      getState().confirmationMetrics.transactionBridgeQuotesById[
        parentTransaction.id
      ] ?? [];

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

    if (quote) {
      properties.mm_pay_quotes_attempts = quote.metrics?.attempts;
      properties.mm_pay_quotes_buffer_size = quote.metrics?.buffer;
      properties.mm_pay_quotes_latency = quote.metrics?.latency;
      properties.mm_pay_bridge_provider = quote.quote.bridgeId;
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
